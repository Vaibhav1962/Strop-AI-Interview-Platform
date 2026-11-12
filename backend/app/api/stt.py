import base64
import os
import time
from app.groq_keys import ordered_keys, record_usage
from app.http_client import shared_client
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status

from app.api.deps import get_current_user
from app.api.rate_limiter import stt_limiter
from app.config import get_settings
from app.models.user import User

router = APIRouter(tags=["stt"])

ELEVEN_STT_URL = "https://api.elevenlabs.io/v1/speech-to-text"
GROQ_STT_URL = "https://api.groq.com/openai/v1/audio/transcriptions"
GROQ_STT_MODELS = ["whisper-large-v3-turbo", "whisper-large-v3"]
# Whisper tends to invent these when handed silence or room noise
WHISPER_SILENCE_HALLUCINATIONS = {"thank you", "thanks for watching", "you", "bye", "thank you for watching"}
GEMINI_TRANSCRIBE_MODELS = [
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent",
]

# Engines that just reported an exhausted quota are skipped for a while instead of costing a failed request each call.
# A per-minute rate limit is different from a dead quota: it clears in seconds, so it uses the provider's Retry-After
# (see _retry_after) instead of the long default, which used to take a working Groq key out for ten minutes.
_COOLDOWN_SECONDS = 600.0
_engine_cooldown: dict[str, float] = {}


def _cooling_down(name: str) -> bool:
    return _engine_cooldown.get(name, 0.0) > time.monotonic()


def _start_cooldown(name: str, seconds: float = _COOLDOWN_SECONDS, why: str = "quota exhausted") -> None:
    _engine_cooldown[name] = time.monotonic() + seconds
    print(f"[Backend STT] {name}: {why}; skipping it for {int(seconds)}s")


def _retry_after(res, default: float = 30.0) -> float:
    """Seconds the provider asked us to wait, clamped to something sensible."""
    try:
        wait = float(res.headers.get("retry-after", ""))
    except (TypeError, ValueError):
        wait = default
    return min(120.0, max(5.0, wait))


MAX_AUDIO_BYTES = 10 * 1024 * 1024  # 10 MB limit
ALLOWED_AUDIO_TYPES = {
    "audio/wav",
    "audio/x-wav",
    "audio/webm",
    "audio/ogg",
    "audio/mpeg",
    "audio/mp3",
    "audio/mp4",
    "audio/m4a",
    "application/octet-stream",  # Fallback when browser doesn't send specific audio mime
}


@router.post("/stt")
async def speech_to_text(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Transcribes an uploaded audio file: Groq Whisper (every configured account), then ElevenLabs Scribe, then Gemini.

    Protected by user authentication, strict 10MB upload bound, and rate limiting.
    """
    # 1. Rate limiting per user
    stt_limiter.check(str(current_user.id))

    # 2. Bounded streaming read (max 10MB + 1 byte probe)
    audio_bytes = await file.read(MAX_AUDIO_BYTES + 1)
    if len(audio_bytes) > MAX_AUDIO_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Audio file exceeds maximum allowed size of 10 MB.",
        )

    # 3. Minimum length check (silent or empty audio)
    if len(audio_bytes) < 100:
        return {"text": "", "language_code": "en"}

    # 4. Content-type and extension validation
    filename = file.filename or "candidate_speech.wav"
    content_type = file.content_type or "audio/wav"
    ext = os.path.splitext(filename)[1].lower()
    valid_exts = {".wav", ".webm", ".ogg", ".mp3", ".m4a"}

    if content_type not in ALLOWED_AUDIO_TYPES and ext not in valid_exts:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported audio media type '{content_type}'. Supported: wav, webm, ogg, mp3.",
        )

    settings = get_settings()
    eleven_key = getattr(settings, "elevenlabs_api_key", "") or os.environ.get("ELEVENLABS_API_KEY", "")
    gemini_key = getattr(settings, "gemini_api_key", "") or os.environ.get("GEMINI_API_KEY", "")
    client = shared_client()

    # 4b. Groq Whisper (Tier 0): free-tier, very fast, accurate. Accounts are tried least-used first, so two keys
    # share the load instead of the first one running dry before the second is touched.
    # A 16 kHz mono 16-bit WAV is 32 000 bytes per second; that is close enough to balance the accounts.
    audio_seconds = max(1, len(audio_bytes) // 32000)
    for model in GROQ_STT_MODELS:
        for key_id, groq_key in ordered_keys(model):
            if _cooling_down(f"{key_id}:{model}"):
                continue
            try:
                res = await client.post(
                    GROQ_STT_URL,
                    headers={"Authorization": f"Bearer {groq_key}"},
                    files={"file": (filename, audio_bytes, content_type)},
                    data={"model": model, "language": "en", "response_format": "json", "temperature": "0"},
                    timeout=30.0,
                )
                if res.status_code == 200:
                    record_usage(key_id, model, audio_seconds)
                    text = (res.json().get("text") or "").strip()
                    normalized = text.lower().strip(" .!?,")
                    if normalized in WHISPER_SILENCE_HALLUCINATIONS and len(audio_bytes) < 60000:
                        return {"text": "", "language_code": "en", "engine": "groq"}
                    if text:
                        return {"text": text, "language_code": "en", "engine": "groq"}
                    return {"text": "", "language_code": "en", "engine": "groq"}  # genuinely empty speech: do not burn other engines
                if res.status_code == 429:
                    _start_cooldown(f"{key_id}:{model}", _retry_after(res), "rate limited")
                elif res.status_code in (401, 403):
                    _start_cooldown(f"{key_id}:{model}", 300.0, f"key rejected (status {res.status_code})")
                print(f"[Backend STT] {key_id} {model} status {res.status_code}: {res.text[:140]}")
            except Exception as e:
                print(f"[Backend STT] {key_id} {model} error: {type(e).__name__}: {e}")

    # 5. Attempt ElevenLabs Scribe (Tier 1)
    if eleven_key and not _cooling_down("elevenlabs"):
        try:
            res = await client.post(
                ELEVEN_STT_URL,
                files={"file": (filename, audio_bytes, content_type)},
                data={"model_id": "scribe_v1"},
                headers={"xi-api-key": eleven_key},
                timeout=20.0,
            )
            if res.status_code == 200:
                result = res.json()
                text = result.get("text", "").strip()
                if text:
                    return {"text": text, "language_code": result.get("language_code", "en"), "engine": "elevenlabs"}
            else:
                if "quota_exceeded" in res.text or res.status_code in (402, 429):
                    _start_cooldown("elevenlabs")
                print(f"[Backend STT] ElevenLabs status: {res.status_code}. Using Gemini Transcribe fallback...")
        except Exception as e:
            print(f"[Backend STT] ElevenLabs error: {type(e).__name__}: {e}. Using Gemini Transcribe fallback...")

    # 6. Attempt Gemini 3.5 Transcribe Fallback (Tier 2)
    if gemini_key:
        try:
            b64_audio = base64.b64encode(audio_bytes).decode("utf-8")
            mime = "audio/wav" if filename.endswith(".wav") else content_type

            payload = {
                "contents": [
                    {
                        "parts": [
                            {"text": "Transcribe this spoken audio verbatim. If silence or no speech, return nothing."},
                            {"inline_data": {"mime_type": mime, "data": b64_audio}},
                        ]
                    }
                ]
            }

            for endpoint_url in GEMINI_TRANSCRIBE_MODELS:
                if _cooling_down(endpoint_url):
                    continue
                try:
                    res = await client.post(endpoint_url, json=payload, headers={"x-goog-api-key": gemini_key}, timeout=25.0)
                    if res.status_code == 429:
                        _start_cooldown(endpoint_url, _retry_after(res, 45.0), "rate limited")
                    if res.status_code == 200:
                        data = res.json()
                        candidate = data.get("candidates", [{}])[0]
                        part = candidate.get("content", {}).get("parts", [{}])[0]
                        text = part.get("audioTranscription", {}).get("text") or part.get("text", "")
                        clean_text = text.strip()
                        if clean_text:
                            return {"text": clean_text, "language_code": "en", "engine": "gemini"}
                except Exception as inner_e:
                    print(f"[Backend STT] Gemini endpoint error: {type(inner_e).__name__}: {inner_e}")
        except Exception as e:
            print(f"[Backend STT] Gemini transcribe error: {type(e).__name__}: {e}")

    # Every engine failed. Say so with a real error status (not a 200 with an empty transcript), so the page can retry
    # and tell the candidate, instead of treating a failure as "you said nothing".
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Transcription is temporarily unavailable on every speech engine.",
    )
