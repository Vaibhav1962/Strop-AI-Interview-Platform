import base64
import os
import time
import httpx
from app.groq_keys import groq_keys
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
_COOLDOWN_SECONDS = 600.0
_engine_cooldown: dict[str, float] = {}


def _cooling_down(name: str) -> bool:
    return _engine_cooldown.get(name, 0.0) > time.monotonic()


def _start_cooldown(name: str) -> None:
    _engine_cooldown[name] = time.monotonic() + _COOLDOWN_SECONDS
    print(f"[Backend STT] {name} quota exhausted; skipping it for {int(_COOLDOWN_SECONDS)}s")


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
    """Transcribes an uploaded audio file using ElevenLabs Scribe with Gemini Transcribe fallback.
    
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
    groq_key = getattr(settings, "groq_api_key", "") or os.environ.get("GROQ_API_KEY", "")

    # 4b. Groq Whisper (Tier 0): free-tier, very fast, accurate
    for model in GROQ_STT_MODELS:
        for key_id, groq_key in groq_keys():
            if _cooling_down(f"{key_id}:{model}"):
                continue
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    res = await client.post(
                        GROQ_STT_URL,
                        headers={"Authorization": f"Bearer {groq_key}"},
                        files={"file": (filename, audio_bytes, content_type)},
                        data={"model": model, "language": "en", "response_format": "json", "temperature": "0"},
                    )
                if res.status_code == 200:
                    text = (res.json().get("text") or "").strip()
                    normalized = text.lower().strip(" .!?,")
                    if normalized in WHISPER_SILENCE_HALLUCINATIONS and len(audio_bytes) < 60000:
                        return {"text": "", "language_code": "en", "engine": "groq"}
                    if text:
                        return {"text": text, "language_code": "en", "engine": "groq"}
                    return {"text": "", "language_code": "en", "engine": "groq"}  # genuinely empty speech: do not burn other engines
                if res.status_code == 429:
                    _start_cooldown(f"{key_id}:{model}")
                print(f"[Backend STT] {key_id} {model} status {res.status_code}: {res.text[:140]}")
            except Exception as e:
                print(f"[Backend STT] {key_id} {model} error: {e}")

    # 5. Attempt ElevenLabs Scribe (Tier 1)
    if eleven_key and not _cooling_down("elevenlabs"):
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                files = {"file": (filename, audio_bytes, content_type)}
                data = {"model_id": "scribe_v1"}
                headers = {"xi-api-key": eleven_key}
                res = await client.post(ELEVEN_STT_URL, files=files, data=data, headers=headers)

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
            print(f"[Backend STT] ElevenLabs error: {e}. Using Gemini Transcribe fallback...")

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
                    async with httpx.AsyncClient(timeout=25.0) as client:
                        res = await client.post(f"{endpoint_url}?key={gemini_key}", json=payload)
                        if res.status_code == 429:
                            _start_cooldown(endpoint_url)
                        if res.status_code == 200:
                            data = res.json()
                            candidate = data.get("candidates", [{}])[0]
                            part = candidate.get("content", {}).get("parts", [{}])[0]
                            text = part.get("audioTranscription", {}).get("text") or part.get("text", "")
                            clean_text = text.strip()
                            if clean_text:
                                return {"text": clean_text, "language_code": "en", "engine": "gemini"}
                except Exception as inner_e:
                    print(f"[Backend STT] Gemini endpoint error: {inner_e}")
        except Exception as e:
            print(f"[Backend STT] Gemini transcribe error: {e}")

    return {"text": "", "error": "Transcription failed on every available engine"}
