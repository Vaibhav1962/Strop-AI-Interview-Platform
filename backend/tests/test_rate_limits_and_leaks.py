"""Rate limits on every LLM-backed / write endpoint, and nothing internal (exceptions, provider keys) reaching the browser."""

import json
import pathlib
import uuid

import pytest
from conftest import async_session_factory
from httpx import ASGITransport, AsyncClient

from app.api import rate_limiter as rl
from app.api.deps import get_current_user
from app.database import get_db
from app.main import app
from app.models.user import User

SID = "00000000-0000-0000-0000-000000000001"

# (method, path, json body, limiter that must guard it)
GUARDED = [
    ("POST", "/api/v1/orchestrator/session", {"track": "dsa", "title": "t"}, "session_create_limiter"),
    ("POST", f"/api/v1/orchestrator/session/{SID}/turn", {"client_turn_id": "a", "expected_turn_index": 0, "candidate_text": "hi"}, "turn_limiter"),
    ("POST", f"/api/v1/orchestrator/session/{SID}/turn/stream", {"client_turn_id": "a", "expected_turn_index": 0, "candidate_text": "hi"}, "turn_limiter"),
    ("POST", f"/api/v1/orchestrator/session/{SID}/submit-code", {"client_turn_id": "a", "expected_turn_index": 0, "code": "x"}, "turn_limiter"),
    ("PATCH", f"/api/v1/orchestrator/session/{SID}/scratchpad", {"notes": "n"}, "scratchpad_limiter"),
    ("POST", f"/api/v1/orchestrator/session/{SID}/evaluate", None, "evaluate_limiter"),
    ("POST", f"/api/v1/orchestrator/session/{SID}/evaluate-async", None, "evaluate_limiter"),
    ("GET", f"/api/v1/orchestrator/session/{SID}/pdf", None, "pdf_limiter"),
    ("POST", "/api/v1/interviews", {"title": "t", "question_count": 0, "duration_seconds": 0, "transcript": []}, "write_limiter"),
    ("POST", "/api/v1/interviews/profile", {"target_role": "x"}, "write_limiter"),
    ("DELETE", f"/api/v1/interviews/{SID}", None, "write_limiter"),
    ("DELETE", "/api/v1/interviews", None, "write_limiter"),
]


async def _no_db():
    """The limiter answers 429 before any handler runs, so these requests need no real database connection."""
    yield None


@pytest.fixture
def signed_in():
    user = User(id=uuid.uuid4(), email="limits@example.com", full_name="Limits", hashed_password="pw")
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_db] = _no_db
    yield user
    app.dependency_overrides.pop(get_current_user, None)
    app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
@pytest.mark.parametrize("method,path,body,limiter_name", GUARDED)
async def test_endpoint_is_rate_limited(monkeypatch, signed_in, method, path, body, limiter_name):
    """With the limiter set to zero allowance the endpoint answers 429 before it touches the database or an LLM."""
    limiter = getattr(rl, limiter_name)
    monkeypatch.setattr(limiter, "max_requests", 0)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.request(method, path, json=body)
    assert resp.status_code == 429, f"{method} {path} is not guarded by {limiter_name}"
    assert resp.headers.get("retry-after")


def test_limits_are_per_user_and_recover():
    limiter = rl.SlidingWindowRateLimiter(max_requests=2, window_seconds=0.2)
    limiter.check("alice")
    limiter.check("alice")
    limiter.check("bob")  # someone else is unaffected
    with pytest.raises(Exception) as exc:
        limiter.check("alice")
    assert getattr(exc.value, "status_code", None) == 429
    import time

    time.sleep(0.25)
    limiter.check("alice")  # window passed


def test_no_server_side_code_execution_endpoint_remains():
    paths = {getattr(r, "path", "") for r in app.routes}
    assert not any(p.rstrip("/").endswith("/execute") for p in paths)
    root = pathlib.Path(__file__).resolve().parents[1] / "app"
    assert not (root / "judge0.py").exists() and not (root / "api" / "execute.py").exists()


def test_provider_keys_never_travel_in_urls():
    """Exception text from an HTTP client includes the request URL, so a key in a query string would reach logs and
    users. Keys must go in headers."""
    root = pathlib.Path(__file__).resolve().parents[1] / "app"
    offenders = []
    for path in root.rglob("*.py"):
        text = path.read_text(encoding="utf-8")
        if "?key=" in text or 'params={"key"' in text or "params={'key'" in text:
            offenders.append(str(path.relative_to(root)))
    assert not offenders, f"API key passed in a URL in: {offenders}"


@pytest.mark.asyncio
async def test_stream_errors_do_not_leak_exception_text(monkeypatch, db_session, test_user):
    """A failing LLM call may raise an error that carries URLs or keys. The browser gets a generic message."""
    from app.orchestrator.actor import InterviewerActor
    from app.services.orchestrator_service import OrchestratorService

    secret = "https://provider.example/v1?key=SUPERSECRET123 connection reset"

    async def boom(self, **kwargs):
        raise RuntimeError(secret)
        yield  # pragma: no cover  (makes this an async generator)

    monkeypatch.setattr(InterviewerActor, "generate_turn_stream", boom)
    session = await OrchestratorService.create_session(db_session, user_id=test_user.id, track="dsa", title="leak test", problem_id=None, target_duration_seconds=900)

    async def _test_db():
        async with async_session_factory() as s:
            yield s

    app.dependency_overrides[get_current_user] = lambda: test_user
    app.dependency_overrides[get_db] = _test_db
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.post(
                f"/api/v1/orchestrator/session/{session.id}/turn/stream",
                json={"client_turn_id": uuid.uuid4().hex[:16], "expected_turn_index": 0, "candidate_text": "hello"},
            )
        body = resp.text
        assert "SUPERSECRET123" not in body and "provider.example" not in body
        events = [json.loads(l[6:]) for l in body.splitlines() if l.startswith("data: ") and l != "data: [DONE]"]
        assert any(e.get("type") == "error" and e.get("message") for e in events)
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        app.dependency_overrides.pop(get_db, None)
        await OrchestratorService.delete_session(db_session, session.id, test_user.id)


@pytest.mark.asyncio
async def test_failed_evaluation_stores_a_generic_error(monkeypatch, db_session, test_user):
    from sqlalchemy import select

    from app.models.orchestrator_session import OrchestratorSession
    from app.services.orchestrator_service import OrchestratorService

    session = await OrchestratorService.create_session(db_session, user_id=test_user.id, track="dsa", title="eval leak", problem_id=None, target_duration_seconds=900)

    async def boom(*args, **kwargs):
        raise RuntimeError("Client error '400' for url 'https://x.example/api?key=SUPERSECRET456'")

    monkeypatch.setattr(OrchestratorService, "evaluate_session", staticmethod(boom))
    # the background task opens its own session from the app's pooled engine; use the test engine (one event loop per test)
    monkeypatch.setattr("app.database.async_session", async_session_factory)
    await OrchestratorService.run_async_evaluation_task(session.id, test_user.id)
    try:
        status, error = (
            await db_session.execute(
                select(OrchestratorSession.evaluation_status, OrchestratorSession.evaluation_error).where(OrchestratorSession.id == session.id)
            )
        ).one()
        assert status == "failed"
        assert error and "SUPERSECRET456" not in error and "x.example" not in error
    finally:
        await OrchestratorService.delete_session(db_session, session.id, test_user.id)


@pytest.mark.asyncio
async def test_oversized_request_bodies_are_refused():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post("/api/v1/auth/login", content=b"x", headers={"content-length": str(31 * 1024 * 1024), "content-type": "application/json"})
    assert resp.status_code == 413
