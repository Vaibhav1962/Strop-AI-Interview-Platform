"""FastAPI Router for server-side Text-To-Speech (TTS).

Proxies speech synthesis requests to ElevenLabs or Gemini Neural TTS.
Enforces session-scoped deterministic voice locking so interviewer voice
remains 100% consistent throughout an interview and never switches mid-session.
Keeps all provider credentials strictly server-side and enforces user authentication.
"""

import asyncio
import base64
import math
import re
import time
import os
import struct
from typing import Optional
from app.groq_keys import estimate_tokens, groq_keys, ordered_keys, record_usage
from app.http_client import shared_client
from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field

from app.api.deps import get_current_user
from app.api.rate_limiter import tts_limiter
from app.config import get_settings
from app.models.user import User

router = APIRouter(tags=["tts"])

# Engines that just reported a dead quota or an unaccepted-terms error are skipped for a while, so each sentence
# does not pay for a request that is known to fail.
_engine_cooldown: dict[str, float] = {}


def _cooling_down(name: str) -> bool:
    return _engine_cooldown.get(name, 0.0) > time.monotonic()


_cooldown_kind: dict[str, str] = {}


def _start_cooldown(name: str, seconds: float, why: str, kind: str = "") -> None:
    _engine_cooldown[name] = time.monotonic() + seconds
    _cooldown_kind[name] = kind
    print(f"[Backend TTS] {name}: {why}; skipping it for {int(seconds)}s")

BRIAN_VOICE_ID = "nPczCjzI2devNBz1zQrb"
ELEVEN_TTS_URL = f"https://api.elevenlabs.io/v1/text-to-speech/{BRIAN_VOICE_ID}?output_format=mp3_44100_128"

GEMINI_TTS_MODELS = [
    "gemini-2.5-flash-preview-tts",
    "gemini-3.1-flash-tts-preview",
    "gemini-3.8-flash-lite-tts",
    "gemini-3.8-flash-tts",
]

# Thread-safe in-memory session-scoped voice locks
# session_id -> {"engine": "elevenlabs" | "gemini", "voice_id": str, "voice_name": str}
SESSION_VOICE_REGISTRY: dict[str, dict] = {}


class TTSRequest(BaseModel):
    text: str = Field(min_length=1, max_length=2000)
    session_id: Optional[str] = None
    voice_id: Optional[str] = None
    preferred_engine: Optional[str] = None


def pcm_to_wav(pcm_data: bytes, sample_rate: int = 24000, num_channels: int = 1) -> bytes:
    """Wraps raw 16-bit PCM bytes with a standard canonical RIFF WAV header."""
    bits_per_sample = 16
    byte_rate = sample_rate * num_channels * (bits_per_sample // 8)
    block_align = num_channels * (bits_per_sample // 8)
    data_size = len(pcm_data)
    chunk_size = 36 + data_size

    header = struct.pack(
        "<4sI4s4sIHHIIHH4sI",
        b"RIFF",
        chunk_size,
        b"WAVE",
        b"fmt ",
        16,  # Subchunk1Size for PCM
        1,   # AudioFormat (1 = PCM)
        num_channels,
        sample_rate,
        byte_rate,
        block_align,
        bits_per_sample,
        b"data",
        data_size,
    )
    return header + pcm_data


GROQ_TTS_URL = "https://api.groq.com/openai/v1/audio/speech"
GROQ_TTS_MODEL = "canopylabs/orpheus-v1-english"
GROQ_TTS_VOICE = "daniel"  # male voice to match the interviewer persona
GROQ_TTS_CHUNK = 190  # the model accepts about 200 characters per request


def _split_for_groq(text: str) -> list[str]:
    """Break text into <=190 char pieces on sentence, then clause, then word boundaries."""
    import re

    pieces: list[str] = []
    current = ""
    for sentence in re.split(r"(?<=[.!?])\s+", text.strip()):
        parts = [sentence]
        if len(sentence) > GROQ_TTS_CHUNK:
            parts = re.split(r"(?<=[,;:])\s+", sentence)
        for part in parts:
            while len(part) > GROQ_TTS_CHUNK:
                cut = part.rfind(" ", 0, GROQ_TTS_CHUNK)
                cut = cut if cut > 40 else GROQ_TTS_CHUNK
                pieces.append(part[:cut].strip())
                part = part[cut:].strip()
            if len(current) + len(part) + 1 <= GROQ_TTS_CHUNK:
                current = f"{current} {part}".strip()
            else:
                if current:
                    pieces.append(current)
                current = part
    if current:
        pieces.append(current)
    return [p for p in pieces if p]


def _wav_pcm(data: bytes) -> tuple[bytes, int, int]:
    """Raw PCM, sample rate and channel count from a WAV file.

    Groq streams its WAV: the header declares an unknown length (0xFFFFFFFF), which the `wave` module and some
    players choke on. The chunks are read by hand and the audio is taken to the end of the file instead.
    """
    if data[:4] != b"RIFF" or data[8:12] != b"WAVE":
        raise ValueError("not a WAV file")
    rate, channels = 24000, 1
    pos = 12
    while pos + 8 <= len(data):
        chunk_id = data[pos : pos + 4]
        size = struct.unpack_from("<I", data, pos + 4)[0]
        body = pos + 8
        if chunk_id == b"fmt ":
            _, channels, rate = struct.unpack_from("<HHI", data, body)
        elif chunk_id == b"data":
            end = body + size if body + size <= len(data) else len(data)
            return data[body:end], rate, channels
        pos = body + size + (size & 1)
    raise ValueError("WAV has no audio data")


def _join_wavs(chunks: list[bytes]) -> bytes:
    """One well-formed WAV from the pieces (also repairs a single piece's unknown-length header)."""
    pcm = b""
    rate, channels = 24000, 1
    for index, data in enumerate(chunks):
        part, part_rate, part_channels = _wav_pcm(data)
        if index == 0:
            rate, channels = part_rate, part_channels
        pcm += part
    return pcm_to_wav(pcm, sample_rate=rate, num_channels=channels)


def _retry_after(res, default: float = 60.0) -> float:
    """Seconds the provider asked us to wait, clamped to something sensible."""
    try:
        wait = float(res.headers.get("retry-after", ""))
    except (TypeError, ValueError):
        wait = default
    return min(120.0, max(5.0, wait))


async def _synthesize_groq(clean_text: str, api_key: str, voice: str = GROQ_TTS_VOICE, tag: str = "groq") -> Optional[bytes]:
    """Groq Orpheus TTS (free tier). Returns WAV bytes, or None when unavailable (terms not accepted, quota, error)."""
    if _cooling_down(tag):
        return None
    try:
        client = shared_client()
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}

        async def one(piece: str):
            return await client.post(
                GROQ_TTS_URL,
                headers=headers,
                json={"model": GROQ_TTS_MODEL, "voice": voice, "input": piece, "response_format": "wav"},
                timeout=20.0,
            )

        # The pieces do not depend on each other, so they are synthesized together instead of one after another;
        # a long reply used to wait for each ~190 character piece in turn.
        pieces = _split_for_groq(clean_text)
        chunks: list[bytes] = []
        for start in range(0, len(pieces), 6):
            for res in await asyncio.gather(*(one(p) for p in pieces[start : start + 6])):
                if res.status_code != 200:
                    print(f"[Backend TTS] Groq Orpheus status {res.status_code}: {res.text[:160]}")
                    if res.status_code == 400 and "terms" in res.text.lower():
                        # Short on purpose: once the terms are accepted the voice should come back within a couple of minutes.
                        _start_cooldown(tag, 120.0, "model terms not accepted (accept them at console.groq.com/playground?model=canopylabs%2Forpheus-v1-english)", kind="terms")
                    elif res.status_code == 429:
                        _start_cooldown(tag, _retry_after(res), "rate limited")
                    return None
                chunks.append(res.content)
        return _join_wavs(chunks) if chunks else None
    except Exception as e:
        print(f"[Backend TTS] Groq Orpheus error: {type(e).__name__}: {e}")
        return None


# Longest we will wait for a rate-limited account to come back before giving up on this sentence. Waiting a few
# seconds keeps the interviewer's voice the same; falling back to a different voice is what we are avoiding.
GROQ_MAX_WAIT_SECONDS = 8.0


def _prepare_speech_text(text: str) -> str:
    """Plain, speakable text: no markdown marks, emoji or stray whitespace the voice model could read oddly."""
    text = re.sub(r"[*_`#>~|]+", " ", text)
    text = re.sub(r"[\U0001F300-\U0001FAFF\u2600-\u27BF]", "", text)
    text = text.replace("\u2014", ", ").replace("\u2013", "-")
    return re.sub(r"\s+", " ", text).strip()


def _groq_all_cooling_wait() -> float:
    """Seconds until the first Groq account is usable again, or 0 when at least one is usable right now."""
    keys = groq_keys()
    if not keys:
        return 0.0
    now = time.monotonic()
    waits = [_engine_cooldown.get(key_id, 0.0) - now for key_id, _ in keys]
    if any(w <= 0 for w in waits):
        return 0.0
    return min(waits)


def _groq_blocked_by_terms() -> bool:
    """True when every configured account is refused only because Orpheus terms were not accepted (a setup problem)."""
    keys = groq_keys()
    return bool(keys) and all(_cooling_down(k) and _cooldown_kind.get(k) == "terms" for k, _ in keys)


def _failure_headers() -> dict[str, str]:
    """Tells the page why Groq could not speak and when asking again can help."""
    reason = "terms" if _groq_blocked_by_terms() else "busy"
    return {"Retry-After": str(_retry_after_seconds()), "X-TTS-Reason": reason}


def _retry_after_seconds() -> int:
    wait = _groq_all_cooling_wait()
    return max(1, min(60, math.ceil(wait))) if wait > 0 else 3


async def _synthesize_groq_any(clean_text: str, voice: str = GROQ_TTS_VOICE) -> Optional[bytes]:
    """Groq Orpheus on whichever account can serve it. The least-used account goes first so both free tiers are
    spent evenly; when one is rate limited the other takes over, and when both are, a short wait is tried once."""
    clean_text = _prepare_speech_text(clean_text)
    if not clean_text:
        return None
    for attempt in range(2):
        for key_id, key in ordered_keys(GROQ_TTS_MODEL):
            audio = await _synthesize_groq(clean_text, key, voice, tag=key_id)
            if audio:
                record_usage(key_id, GROQ_TTS_MODEL, estimate_tokens(clean_text))
                return audio
        wait = _groq_all_cooling_wait()
        if attempt == 0 and 0 < wait <= GROQ_MAX_WAIT_SECONDS:
            await asyncio.sleep(wait + 0.25)
            continue
        break
    return None


async def _synthesize_elevenlabs(clean_text: str, api_key: str, voice_id: str = BRIAN_VOICE_ID) -> Optional[bytes]:
    """Synthesizes text using ElevenLabs Flash v2.5."""
    if _cooling_down("elevenlabs"):
        return None
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=mp3_44100_128"
    try:
        res = await shared_client().post(
            url,
            headers={
                "xi-api-key": api_key,
                "Content-Type": "application/json",
            },
            json={
                "text": clean_text,
                "model_id": "eleven_flash_v2_5",
                "voice_settings": {
                    "stability": 0.55,
                    "similarity_boost": 0.8,
                    "style": 0.0,
                    "use_speaker_boost": True,
                },
            },
            timeout=6.0,
        )
        if res.status_code == 200 and len(res.content) > 200:
            return res.content
        print(f"[Backend TTS] ElevenLabs returned {res.status_code}: {res.text[:200]}")
        if "quota_exceeded" in res.text or res.status_code in (402, 429):
            _start_cooldown("elevenlabs", 600.0, "quota exhausted")
    except Exception as e:
        print(f"[Backend TTS] ElevenLabs network error: {type(e).__name__}: {e}")
    return None


# The page gives up on a sentence after about 7 seconds, so the whole Gemini attempt (every model it tries) stays
# inside that. Anything still running after the page has moved on only wastes quota.
GEMINI_TTS_BUDGET_SECONDS = 6.0


async def _synthesize_gemini(clean_text: str, api_key: str, voice_name: str = "Charon") -> Optional[bytes]:
    """Synthesizes text using Gemini Neural TTS with fallback across compatible model aliases."""
    started = time.monotonic()
    client = shared_client()
    for model in GEMINI_TTS_MODELS:
        remaining = GEMINI_TTS_BUDGET_SECONDS - (time.monotonic() - started)
        if remaining < 1.0:
            break
        if _cooling_down(f"gemini:{model}"):
            continue
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            res = await client.post(
                url,
                headers={"Content-Type": "application/json"},
                json={
                    "contents": [{"parts": [{"text": clean_text}]}],
                    "generationConfig": {
                        "responseModalities": ["AUDIO"],
                        "speechConfig": {
                            "voiceConfig": {
                                "prebuiltVoiceConfig": {
                                    "voiceName": voice_name,
                                }
                            }
                        },
                    },
                },
                timeout=min(5.0, remaining),
            )
            if res.status_code == 200:
                data = res.json()
                parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
                part = next((p for p in parts if p.get("inlineData", {}).get("data")), None)
                if part:
                    raw_b64 = part["inlineData"]["data"]
                    audio_bytes = base64.b64decode(raw_b64)
                    if not audio_bytes.startswith(b"RIFF") and not audio_bytes.startswith(b"ID3"):
                        audio_bytes = pcm_to_wav(audio_bytes, sample_rate=24000)
                    return audio_bytes
            elif res.status_code == 429:
                # Free-tier TTS limits are per model and per minute, so retry that model after a short pause.
                _start_cooldown(f"gemini:{model}", _retry_after(res, 45.0), "rate limited")
            else:
                print(f"[Backend TTS] Gemini model {model} status {res.status_code}: {res.text[:120]}")
        except Exception as e:
            # A timeout means the model is overloaded right now. Skip it for a while instead of making every
            # sentence wait for it again (this used to cost up to 8 seconds per model, per sentence).
            _start_cooldown(f"gemini:{model}", 30.0, f"{type(e).__name__} (overloaded or unreachable)")
    return None


@router.post("/tts")
async def text_to_speech(
    payload: TTSRequest,
    current_user: User = Depends(get_current_user),
):
    """Synthesizes text to audio using server-side ElevenLabs or Gemini Neural TTS.
    
    Guarantees session-scoped voice consistency: once a session is assigned a voice,
    all subsequent sentences in that session use the exact same voice persona.
    Never silently switches voices mid-interview.
    """
    tts_limiter.check(str(current_user.id))

    clean_text = payload.text.strip()
    if not clean_text:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty text provided.")

    settings = get_settings()
    eleven_key = getattr(settings, "elevenlabs_api_key", "") or os.environ.get("ELEVENLABS_API_KEY", "")
    gemini_key = getattr(settings, "gemini_api_key", "") or os.environ.get("GEMINI_API_KEY", "")
    groq_key = getattr(settings, "groq_api_key", "") or os.environ.get("GROQ_API_KEY", "")

    # The voice lock is per user and session, so one user can never read or clear another's.
    session_id = f"{current_user.id}:{payload.session_id.strip()[:80]}" if payload.session_id else None

    # Check for existing session voice lock
    locked_config = SESSION_VOICE_REGISTRY.get(session_id) if session_id else None

    if locked_config:
        # Session voice is already locked. Enforce deterministic voice consistency.
        engine = locked_config["engine"]
        if engine == "groq":
            audio = await _synthesize_groq_any(clean_text, locked_config.get("voice_name", GROQ_TTS_VOICE))
            if audio:
                return Response(
                    content=audio,
                    media_type="audio/wav",
                    headers={"X-TTS-Engine": "groq", "X-TTS-Voice": locked_config.get("voice_name", GROQ_TTS_VOICE), "X-TTS-Session-Locked": "true"},
                )
            # Locked engine failed: DO NOT switch voice mid-interview!
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Configured interviewer voice (Groq Orpheus) is temporarily unavailable.",
                headers=_failure_headers(),
            )

        if engine == "elevenlabs":
            if not eleven_key:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Session locked voice (ElevenLabs Brian) has no active API key.",
                )
            audio = await _synthesize_elevenlabs(clean_text, eleven_key, locked_config.get("voice_id", BRIAN_VOICE_ID))
            if audio:
                return Response(
                    content=audio,
                    media_type="audio/mpeg",
                    headers={
                        "X-TTS-Engine": "elevenlabs",
                        "X-TTS-Voice": locked_config.get("voice_id", BRIAN_VOICE_ID),
                        "X-TTS-Session-Locked": "true",
                    },
                )
            # Locked engine failed: DO NOT switch voice mid-interview!
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Configured interviewer voice (ElevenLabs Brian) is temporarily unavailable.",
            )

        elif engine == "gemini":
            if not gemini_key:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Session locked voice (Gemini Charon) has no active API key.",
                )
            audio = await _synthesize_gemini(clean_text, gemini_key, locked_config.get("voice_name", "Charon"))
            if audio:
                return Response(
                    content=audio,
                    media_type="audio/wav",
                    headers={
                        "X-TTS-Engine": "gemini",
                        "X-TTS-Voice": locked_config.get("voice_name", "Charon"),
                        "X-TTS-Session-Locked": "true",
                    },
                )
            # Locked engine failed: DO NOT switch voice mid-interview!
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Configured interviewer voice (Gemini Charon) is temporarily unavailable.",
            )

    # Initial session voice selection & locking
    # If client specifies preferred_engine, respect it; otherwise probe ElevenLabs first then Gemini.
    target_engine = payload.preferred_engine

    if target_engine == "gemini":
        if gemini_key:
            audio = await _synthesize_gemini(clean_text, gemini_key, "Charon")
            if audio:
                if session_id:
                    SESSION_VOICE_REGISTRY[session_id] = {"engine": "gemini", "voice_name": "Charon"}
                return Response(
                    content=audio,
                    media_type="audio/wav",
                    headers={"X-TTS-Engine": "gemini", "X-TTS-Voice": "Charon", "X-TTS-Session-Locked": "true" if session_id else "false"},
                )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Gemini speech synthesis is unavailable.",
        )

    # Groq Orpheus is the interviewer's voice whenever an account is configured. Any failure (rate limit, network,
    # terms not accepted) is reported as "unavailable" rather than answered by a different engine, which would change
    # the voice mid-interview. The ElevenLabs / Gemini engines below only serve setups with no Groq account at all.
    if groq_keys() and target_engine in (None, "groq"):
        audio = await _synthesize_groq_any(clean_text, GROQ_TTS_VOICE)
        if audio:
            if session_id:
                SESSION_VOICE_REGISTRY[session_id] = {"engine": "groq", "voice_name": GROQ_TTS_VOICE}
            return Response(
                content=audio,
                media_type="audio/wav",
                headers={"X-TTS-Engine": "groq", "X-TTS-Voice": GROQ_TTS_VOICE, "X-TTS-Session-Locked": "true" if session_id else "false"},
            )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Interviewer voice is temporarily unavailable. Try again shortly.",
            headers=_failure_headers(),
        )

    # ElevenLabs preference: Try ElevenLabs next
    if eleven_key and target_engine != "gemini":
        audio = await _synthesize_elevenlabs(clean_text, eleven_key, BRIAN_VOICE_ID)
        if audio:
            if session_id:
                SESSION_VOICE_REGISTRY[session_id] = {"engine": "elevenlabs", "voice_id": BRIAN_VOICE_ID}
            return Response(
                content=audio,
                media_type="audio/mpeg",
                headers={"X-TTS-Engine": "elevenlabs", "X-TTS-Voice": BRIAN_VOICE_ID, "X-TTS-Session-Locked": "true" if session_id else "false"},
            )

    # If ElevenLabs was not requested exclusively and failed on the very first turn before lock, try Gemini
    if gemini_key and not target_engine:
        audio = await _synthesize_gemini(clean_text, gemini_key, "Charon")
        if audio:
            if session_id:
                SESSION_VOICE_REGISTRY[session_id] = {"engine": "gemini", "voice_name": "Charon"}
            return Response(
                content=audio,
                media_type="audio/wav",
                headers={"X-TTS-Engine": "gemini", "X-TTS-Voice": "Charon", "X-TTS-Session-Locked": "true" if session_id else "false"},
            )

    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Speech synthesis is temporarily unavailable across all configured voice providers.",
    )


@router.delete("/tts/session/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def clear_session_voice(
    session_id: str,
    current_user: User = Depends(get_current_user),
):
    """Clears the session-scoped voice lock when an interview completes."""
    SESSION_VOICE_REGISTRY.pop(f"{current_user.id}:{session_id[:80]}", None)
