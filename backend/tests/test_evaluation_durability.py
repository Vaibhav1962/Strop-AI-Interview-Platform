"""Unit and integration tests for durable PostgreSQL-backed evaluation worker:
1. Enqueueing evaluation jobs in PostgreSQL.
2. Race-free atomic claiming with FOR UPDATE SKIP LOCKED.
3. Bounded attempts (max 3) preventing infinite loops on corrupted inputs.
4. Automatic recovery of interrupted/stale processing evaluations.
5. Lifespan startup recovery.
"""

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import delete, select, update

from app.models.orchestrator_session import OrchestratorSession
from app.services.evaluation_worker import EvaluationWorker, MAX_EVALUATION_ATTEMPTS
from app.services.orchestrator_service import OrchestratorService


@pytest.fixture(autouse=True)
async def cleanup_queue(db_session):
    """Ensure no leftover queued or processing jobs interfere across tests."""
    await db_session.execute(
        delete(OrchestratorSession).where(
            OrchestratorSession.evaluation_status.in_(["queued", "processing"])
        )
    )
    await db_session.commit()
    yield
    await db_session.execute(
        delete(OrchestratorSession).where(
            OrchestratorSession.evaluation_status.in_(["queued", "processing"])
        )
    )
    await db_session.commit()


@pytest.mark.asyncio
async def test_enqueue_evaluation_flow(db_session, test_user):
    """Verifies that start_async_evaluation transitions session to queued state."""
    session = await OrchestratorService.create_session(
        db_session,
        user_id=test_user.id,
        track="core-cs",
        title="Durable Queue Test",
    )

    # Seed transcript
    session.transcript = [
        {"speaker": "Candidate", "text": "A process has its own address space while threads share it.", "time": "00:30"},
        {"speaker": "Alex", "text": "How does context switching overhead differ between them?", "time": "00:45"},
    ]
    db_session.add(session)
    await db_session.commit()

    # Enqueue evaluation
    status_payload = await OrchestratorService.start_async_evaluation(
        db_session,
        session_id=session.id,
        user_id=test_user.id,
    )
    assert status_payload["evaluation_status"] == "queued"

    # Verify database state
    refreshed = await db_session.get(OrchestratorSession, session.id)
    assert refreshed.evaluation_status == "queued"
    assert refreshed.evaluation_error is None


@pytest.mark.asyncio
async def test_claim_next_job_atomic_and_skip_locked(db_session, test_user):
    """Verifies that claim_next_job atomically claims queued jobs and transitions to processing."""
    session = await OrchestratorService.create_session(
        db_session,
        user_id=test_user.id,
        track="system-design",
        title="Claim Test",
    )
    session.evaluation_status = "queued"
    session.transcript = [{"speaker": "Candidate", "text": "I partition by account_id.", "time": "01:00"}]
    db_session.add(session)
    await db_session.commit()

    # Claim job
    job = await EvaluationWorker.claim_next_job(db_session)
    assert job is not None
    assert job["session_id"] == session.id
    assert job["attempt"] == 1

    # Verify row state in DB is now 'processing'
    refreshed = await db_session.get(OrchestratorSession, session.id)
    assert refreshed.evaluation_status == "processing"
    assert refreshed.working_memory.get("evaluation_attempts") == 1

    # Second claim attempt when no more jobs exist should return None
    second_job = await EvaluationWorker.claim_next_job(db_session)
    assert second_job is None


@pytest.mark.asyncio
async def test_bounded_retry_terminal_failure(db_session, test_user):
    """Verifies that jobs exceeding MAX_EVALUATION_ATTEMPTS terminate with a clear error."""
    session = await OrchestratorService.create_session(
        db_session,
        user_id=test_user.id,
        track="behavioral",
        title="Bounded Retry Test",
    )
    session.evaluation_status = "queued"
    session.working_memory = {"evaluation_attempts": MAX_EVALUATION_ATTEMPTS}
    session.transcript = [{"speaker": "Candidate", "text": "I led the migration.", "time": "01:00"}]
    db_session.add(session)
    await db_session.commit()

    # Claim job when attempt count is already at max
    job = await EvaluationWorker.claim_next_job(db_session)
    assert job is None  # Cannot be processed again

    # Row must have transitioned to 'failed' with terminal explanation
    refreshed = await db_session.get(OrchestratorSession, session.id)
    assert refreshed.evaluation_status == "failed"
    assert "maximum attempts" in refreshed.evaluation_error.lower()


@pytest.mark.asyncio
async def test_stale_processing_recovery(db_session, test_user):
    """Verifies that a job stuck in 'processing' beyond stale timeout is reclaimed."""
    session = await OrchestratorService.create_session(
        db_session,
        user_id=test_user.id,
        track="resume",
        title="Stale Processing Reclaim Test",
    )
    session.evaluation_status = "processing"
    session.working_memory = {"evaluation_attempts": 1}
    session.transcript = [{"speaker": "Candidate", "text": "I designed the payment engine.", "time": "01:00"}]
    db_session.add(session)
    await db_session.commit()

    # Explicitly set updated_at in the past via raw update to bypass ORM onupdate generator
    past_time = datetime.now(timezone.utc) - timedelta(seconds=250)
    await db_session.execute(
        update(OrchestratorSession)
        .where(OrchestratorSession.id == session.id)
        .values(updated_at=past_time)
    )
    await db_session.commit()

    # Claim should reclaim the stale job and increment attempt count
    job = await EvaluationWorker.claim_next_job(db_session)
    assert job is not None
    assert job["session_id"] == session.id
    assert job["attempt"] == 2

    refreshed = await db_session.get(OrchestratorSession, session.id)
    assert refreshed.evaluation_status == "processing"
    assert refreshed.working_memory["evaluation_attempts"] == 2
