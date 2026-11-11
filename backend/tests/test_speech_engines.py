"""Speech engines: fast failover, no long lockouts, parallel synthesis, honest failures.

The Groq / Gemini / ElevenLabs calls are replaced by a fake HTTP client, so these run offline.
"""

import io
import time
import uuid
import wave

import httpx
import pytest
from httpx import ASGITransport, AsyncClient

from app.api import stt as stt_mod
from app.api import tts as tts_mod
from app.main import app
from app.models.user import User


def make_wav(frames: int = 2400, rate: int = 24000) -> bytes:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(b"\x01\x00" * frames)
    return buf.getvalue()


class FakeResponse:
    def __init__(self, status_code=200, content=b"", text="", headers=None, json_data=None):
        self.status_code = status_code
        self.content = content
        self.text = text
        self.headers = headers or {}
        self._json = json_data

    def json(self):
        return self._json


class FakeClient:
    """Stands in for the shared httpx client. `handler(url, kwargs)` returns a FakeResponse or raises."""

    def __init__(self, handler):
        self.handler = handler
        self.calls = []

    async def post(self, url, **kwargs):
        self.calls.append((url, kwargs))
        return await self.handler(url, kwargs)


@pytest.fixture(autouse=True)
def clean_state(monkeypatch):
    tts_mod._engine_cooldown.clear()
    stt_mod._engine_cooldown.clear()
    monkeypatch.setenv("GROQ_API_KEY", "gsk_test_one")
    monkeypatch.delenv("GROQ2_API_KEY", raising=False)
    yield
    tts_mod._engine_cooldown.clear()
    stt_mod._engine_cooldown.clear()


# ── TTS ─────────────────────────────────────────────────────────────────────────────────────────────────────────────


async def test_orpheus_pieces_are_synthesized_together_not_one_after_another(monkeypatch):
    import asyncio

    async def handler(url, kwargs):
        await asyncio.sleep(0.25)  # each piece takes a quarter second
        return FakeResponse(200, content=make_wav())

    monkeypatch.setattr(tts_mod, "shared_client", lambda: FakeClient(handler))
    # Four sentences of ~150 characters each are four separate pieces for the ~190 character limit.
    text = " ".join(f"Sentence number {i} " + "and it goes on " * 8 + "to the very end." for i in range(4))
    assert len(tts_mod._split_for_groq(text)) >= 4

    started = time.monotonic()
    audio = await tts_mod._synthesize_groq(text, "gsk_x", tag="groq1")
    elapsed = time.monotonic() - started

    assert audio is not None
    assert elapsed < 0.7, f"pieces ran sequentially ({elapsed:.2f}s)"
    with wave.open(io.BytesIO(audio)) as w:
        assert w.getnframes() >= 4 * 2400  # every piece is in the joined audio, in order


async def test_terms_not_accepted_recovers_within_minutes_not_an_hour(monkeypatch):
    async def handler(url, kwargs):
        return FakeResponse(400, text='{"error":{"message":"The model requires terms acceptance."}}')

    monkeypatch.setattr(tts_mod, "shared_client", lambda: FakeClient(handler))
    assert await tts_mod._synthesize_groq("Hello there.", "gsk_x", tag="groq1") is None
    assert tts_mod._cooling_down("groq1")
    assert tts_mod._engine_cooldown["groq1"] - time.monotonic() <= 125  # was 3600


async def test_second_account_serves_tts_when_the_first_is_blocked(monkeypatch):
    monkeypatch.setenv("GROQ2_API_KEY", "gsk_test_two")

    async def handler(url, kwargs):
        if kwargs["headers"]["Authorization"].endswith("gsk_test_one"):
            return FakeResponse(400, text="requires terms acceptance")
        return FakeResponse(200, content=make_wav())

    monkeypatch.setattr(tts_mod, "shared_client", lambda: FakeClient(handler))
    audio = await tts_mod._synthesize_groq_any("Hello there.")
    assert audio is not None
    assert tts_mod._cooling_down("groq1") and not tts_mod._cooling_down("groq2")


async def test_gemini_timeout_puts_that_model_aside_instead_of_stalling_every_sentence(monkeypatch):
    async def handler(url, kwargs):
        raise httpx.ReadTimeout("slow")

    fake = FakeClient(handler)
    monkeypatch.setattr(tts_mod, "shared_client", lambda: fake)
    assert await tts_mod._synthesize_gemini("Hello.", "key") is None
    tried = len(fake.calls)
    assert tried >= 1 and all(tts_mod._cooling_down(f"gemini:{m}") for m in tts_mod.GEMINI_TTS_MODELS[:tried])

    # The next sentence skips those models outright: no request is made for them.
    fake.calls.clear()
    await tts_mod._synthesize_gemini("Hello again.", "key")
    assert len(fake.calls) <= len(tts_mod.GEMINI_TTS_MODELS) - tried


async def test_gemini_attempt_stays_inside_the_pages_deadline(monkeypatch):
    import asyncio

    async def handler(url, kwargs):
        assert kwargs["timeout"] <= 5.0
        await asyncio.sleep(0)
        raise httpx.ConnectTimeout("no route")

    monkeypatch.setattr(tts_mod, "shared_client", lambda: FakeClient(handler))
    assert tts_mod.GEMINI_TTS_BUDGET_SECONDS <= 6.5
    await tts_mod._synthesize_gemini("Hello.", "key")


# ── STT ─────────────────────────────────────────────────────────────────────────────────────────────────────────────


def authed(monkeypatch):
    from app.api.deps import get_current_user

    user = User(id=uuid.uuid4(), email="stt@example.com", full_name="Stt", hashed_password="pw")
    app.dependency_overrides[get_current_user] = lambda: user
    monkeypatch.setattr(stt_mod, "get_settings", lambda: type("S", (), {"elevenlabs_api_key": "", "gemini_api_key": ""})())
    return get_current_user


async def post_audio():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        return await client.post("/api/v1/stt", files={"file": ("a.wav", io.BytesIO(make_wav(16000, 16000)), "audio/wav")})


async def test_groq_rate_limit_uses_retry_after_not_ten_minutes(monkeypatch):
    dep = authed(monkeypatch)
    try:
        async def handler(url, kwargs):
            return FakeResponse(429, text="rate limit", headers={"retry-after": "7"})

        monkeypatch.setattr(stt_mod, "shared_client", lambda: FakeClient(handler))
        resp = await post_audio()
        assert resp.status_code == 503
        wait = stt_mod._engine_cooldown["groq1:whisper-large-v3-turbo"] - time.monotonic()
        assert 5 <= wait <= 8, f"cooldown was {wait:.0f}s, should follow Retry-After (7s)"
    finally:
        app.dependency_overrides.pop(dep, None)


async def test_every_engine_failing_is_an_error_not_an_empty_transcript(monkeypatch):
    dep = authed(monkeypatch)
    try:
        async def handler(url, kwargs):
            return FakeResponse(500, text="boom")

        monkeypatch.setattr(stt_mod, "shared_client", lambda: FakeClient(handler))
        resp = await post_audio()
        assert resp.status_code == 503
        assert "unavailable" in resp.json()["detail"].lower()
    finally:
        app.dependency_overrides.pop(dep, None)


async def test_second_account_takes_over_stt_when_the_first_is_rate_limited(monkeypatch):
    monkeypatch.setenv("GROQ2_API_KEY", "gsk_test_two")
    dep = authed(monkeypatch)
    try:
        async def handler(url, kwargs):
            if kwargs["headers"]["Authorization"].endswith("gsk_test_one"):
                return FakeResponse(429, text="rate limit", headers={"retry-after": "30"})
            return FakeResponse(200, json_data={"text": "hello from the second account"})

        monkeypatch.setattr(stt_mod, "shared_client", lambda: FakeClient(handler))
        resp = await post_audio()
        assert resp.status_code == 200
        assert resp.json()["text"] == "hello from the second account"
    finally:
        app.dependency_overrides.pop(dep, None)


async def test_two_accounts_share_stt_load_instead_of_draining_the_first(monkeypatch):
    from app import groq_keys as gk

    monkeypatch.setenv("GROQ2_API_KEY", "gsk_test_two")
    gk._usage.clear()
    dep = authed(monkeypatch)
    try:
        used = []

        async def handler(url, kwargs):
            used.append(kwargs["headers"]["Authorization"][-3:])
            return FakeResponse(200, json_data={"text": "ok words"})

        monkeypatch.setattr(stt_mod, "shared_client", lambda: FakeClient(handler))
        for _ in range(4):
            assert (await post_audio()).status_code == 200
        assert set(used) == {"one", "two"}, f"only one account was used: {used}"
    finally:
        app.dependency_overrides.pop(dep, None)
        gk._usage.clear()
