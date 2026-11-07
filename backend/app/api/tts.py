"""FastAPI Router for server-side Text-To-Speech (TTS).

Proxies speech synthesis requests to ElevenLabs or Gemini Neural TTS.
Enforces session-scoped deterministic voice locking so interviewer voice
remains 100% consistent throughout an interview and never switches mid-session.
Keeps all provider credentials strictly server-side and enforces user authentication.
"""

import base64
import time
import os
import struct
from typing import Optional
import httpx
from app.groq_keys import groq_keys
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


def _start_cooldown(name: str, seconds: float, why: str) -> None:
    _engine_cooldown[name] = time.monotonic() + seconds
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


def _join_wavs(chunks: list[bytes]) -> bytes:
    import io
    import wave

    if len(chunks) == 1:
        return chunks[0]
    frames = b""
    params = None
    for data in chunks:
        with wave.open(io.BytesIO(data)) as w:
            params = params or w.getparams()
            frames += w.readframes(w.getnframes())
    out = io.BytesIO()
    with wave.open(out, "wb") as w:
        w.setparams(params)
        w.writeframes(frames)
    return out.getvalue()


async def _synthesize_groq(clean_text: str, api_key: str, voice: str = GROQ_TTS_VOICE, tag: str = "groq") -> Optional[bytes]:
    """Groq Orpheus TTS (free tier). Returns WAV bytes, or None when unavailable (terms not accepted, quota, error)."""
    if _cooling_down(tag):
        return None
    try:
        chunks: list[bytes] = []
        async with httpx.AsyncClient(timeout=30.0) as client:
            for piece in _split_for_groq(clean_text):
                res = await client.post(
                    GROQ_TTS_URL,
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json={"model": GROQ_TTS_MODEL, "voice": voice, "input": piece, "response_format": "wav"},
                )
                if res.status_code != 200:
                    print(f"[Backend TTS] Groq Orpheus status {res.status_code}: {res.text[:160]}")
                    if res.status_code == 400 and "terms" in res.text.lower():
                        _start_cooldown(tag, 3600.0, "model terms not accepted (accept them at console.groq.com/playground?model=canopylabs%2Forpheus-v1-english)")
                    elif res.status_code == 429:
                        _start_cooldown(tag, 60.0, "rate limited")
                    return None
                chunks.append(res.content)
        return _join_wavs(chunks) if chunks else None
    except Exception as e:
        print(f"[Backend TTS] Groq Orpheus error: {e}")
        return None


async def _synthesize_groq_any(clean_text: str, voice: str = GROQ_TTS_VOICE) -> Optional[bytes]:
    """Groq Orpheus on the first configured account that can serve it (terms accepted, not rate limited)."""
    for key_id, key in groq_keys():
        audio = await _synthesize_groq(clean_text, key, voice, tag=key_id)
        if audio:
            return audio
    return None


async def _synthesize_elevenlabs(clean_text: str, api_key: str, voice_id: str = BRIAN_VOICE_ID) -> Optional[bytes]:
    """Synthesizes text using ElevenLabs Flash v2.5."""
    if _cooling_down("elevenlabs"):
        return None
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}?output_format=mp3_44100_128"
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            res = await client.post(
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
            )
            if res.status_code == 200 and len(res.content) > 200:
                return res.content
            print(f"[Backend TTS] ElevenLabs returned {res.status_code}: {res.text[:200]}")
            if "quota_exceeded" in res.text or res.status_code in (402, 429):
                _start_cooldown("elevenlabs", 600.0, "quota exhausted")
    except Exception as e:
        print(f"[Backend TTS] ElevenLabs network error: {e}")
    return None


async def _synthesize_gemini(clean_text: str, api_key: str, voice_name: str = "Charon") -> Optional[bytes]:
    """Synthesizes text using Gemini Neural TTS with fallback across compatible model aliases."""
    started = time.monotonic()
    for model in GEMINI_TTS_MODELS:
        # The page gives up on a sentence after a few seconds; do not keep trying models it has stopped waiting for.
        if time.monotonic() - started > 12.0:
            break
        if _cooling_down(f"gemini:{model}"):
            continue
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            async with httpx.AsyncClient(timeout=8.0) as client:
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
                    _start_cooldown(f"gemini:{model}", 45.0, "rate limited")
                else:
                    print(f"[Backend TTS] Gemini model {model} status {res.status_code}: {res.text[:120]}")
        except Exception as e:
            print(f"[Backend TTS] Gemini model {model} error: {e}")
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

    # Default: Groq Orpheus first (free tier), then ElevenLabs, then Gemini
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
