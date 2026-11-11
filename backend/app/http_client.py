"""One pooled HTTP client for the speech providers.

The STT and TTS routes used to open a fresh `httpx.AsyncClient` per request, which pays a new TCP + TLS handshake to
Groq / ElevenLabs / Gemini every time (a few hundred milliseconds, on every sentence and every transcription). A shared
client keeps connections alive between requests. Timeouts are passed per request by the caller.

A client is tied to the event loop it was first used on, so one is created per running loop (the server has a single
loop; tests and scripts that start a new loop get a fresh client instead of a "loop is closed" error).
"""

import asyncio

import httpx

_client: httpx.AsyncClient | None = None
_client_loop: asyncio.AbstractEventLoop | None = None


def shared_client() -> httpx.AsyncClient:
    global _client, _client_loop
    loop = asyncio.get_running_loop()
    if _client is None or _client.is_closed or _client_loop is not loop:
        _client = httpx.AsyncClient(
            timeout=httpx.Timeout(30.0, connect=5.0),
            limits=httpx.Limits(max_connections=40, max_keepalive_connections=20, keepalive_expiry=45.0),
        )
        _client_loop = loop
    return _client
