import asyncio
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from tests.conftest import async_session_factory
from app.models.user import User
from app.services.orchestrator_service import OrchestratorService


@pytest.mark.asyncio
async def test_concurrent_reservation_mutual_exclusion(test_user: User, db_session: AsyncSession):
    """Verify that two concurrent workers cannot both reserve turn 0."""
    session = await OrchestratorService.create_session(
        db_session, user_id=test_user.id, track="System Design", title="Mutual Exclusion Test"
    )
    session_id = session.id

    client_turn_a = f"turn-a-{uuid.uuid4()}"
    client_turn_b = f"turn-b-{uuid.uuid4()}"
    text_a = "Worker A proposing Cassandra cluster"
    text_b = "Worker B proposing DynamoDB cluster"

    async def worker_a():
        async with async_session_factory() as db:
            return await OrchestratorService.reserve_turn(
                db, session_id=session_id, user_id=test_user.id,
                expected_turn_index=0, client_turn_id=client_turn_a, candidate_text=text_a,
                lease_duration_seconds=45,
            )

    async def worker_b():
        async with async_session_factory() as db:
            return await OrchestratorService.reserve_turn(
                db, session_id=session_id, user_id=test_user.id,
                expected_turn_index=0, client_turn_id=client_turn_b, candidate_text=text_b,
                lease_duration_seconds=45,
            )

    results = await asyncio.gather(worker_a(), worker_b(), return_exceptions=True)

    # Exactly one must succeed, and the other must raise HTTPException (409 or 429)
    successes = [r for r in results if isinstance(r, dict) and not r.get("is_cached_replay")]
    failures = [r for r in results if isinstance(r, HTTPException)]

    assert len(successes) == 1, f"Expected exactly 1 success, got {len(successes)}: {results}"
    assert len(failures) == 1, f"Expected exactly 1 failure, got {len(failures)}: {results}"
    assert failures[0].status_code in (409, 429)

    # Verify database state matches the winner
    refreshed = await OrchestratorService.get_session(db_session, session_id, test_user.id)
    assert refreshed is not None
    assert refreshed.fencing_token == 1
    assert refreshed.turn_index == 0
    assert refreshed.in_flight_turn_id in (client_turn_a, client_turn_b)


@pytest.mark.asyncio
async def test_stale_worker_commit_rejected(test_user: User, db_session: AsyncSession):
    """Verify that Worker A with a stale fencing token is blocked from committing after Worker B reclaims."""
    session = await OrchestratorService.create_session(
        db_session, user_id=test_user.id, track="System Design", title="Stale Commit Test"
    )
    session_id = session.id
    turn_id = f"turn-{uuid.uuid4()}"
    candidate_text = "I will use single-leader replication"

    # 1. Worker A reserves turn 0 (token 1)
    res_a = await OrchestratorService.reserve_turn(
        db_session, session_id=session_id, user_id=test_user.id,
        expected_turn_index=0, client_turn_id=turn_id, candidate_text=candidate_text,
        lease_duration_seconds=15,
    )
    fencing_token_a = res_a["fencing_token"]
    assert fencing_token_a == 1

    # 2. Simulate Worker A being stalled past lease expiry (force expired timestamp in DB)
    past_time = datetime.now(timezone.utc) - timedelta(seconds=60)
    await db_session.execute(
        text("UPDATE orchestrator_sessions SET in_flight_expires_at = :past WHERE id = :id"),
        {"past": past_time, "id": session_id},
    )
    await db_session.commit()

    # 3. Worker B reclaims the expired lease for turn 0 (token 2)
    res_b = await OrchestratorService.reserve_turn(
        db_session, session_id=session_id, user_id=test_user.id,
        expected_turn_index=0, client_turn_id=turn_id, candidate_text=candidate_text,
        lease_duration_seconds=45,
    )
    fencing_token_b = res_b["fencing_token"]
    assert fencing_token_b == 2

    # 4. Worker A finally finishes its delayed model call and attempts to commit with stale token 1
    with pytest.raises(HTTPException) as exc_info:
        await OrchestratorService.commit_turn(
            db_session, session_id=session_id, user_id=test_user.id,
            expected_turn_index=0, fencing_token=fencing_token_a,
            client_turn_id=turn_id, candidate_text=candidate_text,
            assistant_response="Worker A stale question: How do you handle write skew?",
        )
    assert exc_info.value.status_code == 409
    assert "stale fencing token" in exc_info.value.detail.lower()

    # 5. Worker B commits successfully with valid token 2
    committed_session = await OrchestratorService.commit_turn(
        db_session, session_id=session_id, user_id=test_user.id,
        expected_turn_index=0, fencing_token=fencing_token_b,
        client_turn_id=turn_id, candidate_text=candidate_text,
        assistant_response="Worker B valid question: Tell me about your failover strategy.",
        delta_metadata={"technical_claims": ["single-leader replication"]},
    )
    assert committed_session.turn_index == 1
    assert committed_session.fencing_token == 3
    assert len(committed_session.transcript) == 2
    assert committed_session.transcript[1]["text"] == "Worker B valid question: Tell me about your failover strategy."


@pytest.mark.asyncio
async def test_committed_idempotent_replay(test_user: User, db_session: AsyncSession):
    """Verify that a committed turn immediately returns cached result without re-reserving or re-inferencing."""
    session = await OrchestratorService.create_session(
        db_session, user_id=test_user.id, track="System Design", title="Replay Test"
    )
    session_id = session.id
    turn_id = f"turn-replay-{uuid.uuid4()}"
    candidate_text = "I will use Raft consensus for state replication."
    assistant_text = "What is the quorum requirement for a 5-node Raft cluster?"

    # 1. Reserve and commit turn 0
    res = await OrchestratorService.reserve_turn(
        db_session, session_id=session_id, user_id=test_user.id,
        expected_turn_index=0, client_turn_id=turn_id, candidate_text=candidate_text,
    )
    await OrchestratorService.commit_turn(
        db_session, session_id=session_id, user_id=test_user.id,
        expected_turn_index=0, fencing_token=res["fencing_token"],
        client_turn_id=turn_id, candidate_text=candidate_text,
        assistant_response=assistant_text,
    )

    # 2. Replay with identical client_turn_id and candidate text
    replay_res = await OrchestratorService.reserve_turn(
        db_session, session_id=session_id, user_id=test_user.id,
        expected_turn_index=0, client_turn_id=turn_id, candidate_text=candidate_text,
    )

    assert replay_res["is_cached_replay"] is True
    assert replay_res["cached_response"] is not None
    assert replay_res["cached_response"]["text"] == assistant_text
    assert replay_res["cached_response"]["speaker"] == "Alex"

    # Verify session turn_index did not advance
    refreshed = await OrchestratorService.get_session(db_session, session_id, test_user.id)
    assert refreshed.turn_index == 1


@pytest.mark.asyncio
async def test_durable_idempotency_hash_mismatch_rejected(test_user: User, db_session: AsyncSession):
    """Verify that reusing the same client_turn_id with altered candidate text is rejected with HTTP 422."""
    session = await OrchestratorService.create_session(
        db_session, user_id=test_user.id, track="System Design", title="Hash Mismatch Test"
    )
    session_id = session.id
    turn_id = f"turn-mismatch-{uuid.uuid4()}"

    # 1. First reservation with initial text
    await OrchestratorService.reserve_turn(
        db_session, session_id=session_id, user_id=test_user.id,
        expected_turn_index=0, client_turn_id=turn_id,
        candidate_text="I choose PostgreSQL for ACID compliance.",
        lease_duration_seconds=15,
    )

    # 2. Retry with same client_turn_id but altered text while in-flight -> 422
    with pytest.raises(HTTPException) as exc_1:
        await OrchestratorService.reserve_turn(
            db_session, session_id=session_id, user_id=test_user.id,
            expected_turn_index=0, client_turn_id=turn_id,
            candidate_text="I choose MongoDB for flexible document schema.",
        )
    assert exc_1.value.status_code == 422
    assert "conflicting payload_hash" in exc_1.value.detail

    # 3. Force lease to expire, then retry with altered text -> still 422 (durable ledger prevents tampering)
    past_time = datetime.now(timezone.utc) - timedelta(seconds=60)
    await db_session.execute(
        text("UPDATE orchestrator_sessions SET in_flight_expires_at = :past WHERE id = :id"),
        {"past": past_time, "id": session_id},
    )
    await db_session.commit()

    with pytest.raises(HTTPException) as exc_2:
        await OrchestratorService.reserve_turn(
            db_session, session_id=session_id, user_id=test_user.id,
            expected_turn_index=0, client_turn_id=turn_id,
            candidate_text="I choose MongoDB for flexible document schema.",
        )
    assert exc_2.value.status_code == 422
    assert "conflicting payload_hash" in exc_2.value.detail


@pytest.mark.asyncio
async def test_lease_renewal_heartbeat(test_user: User, db_session: AsyncSession):
    """Verify that a worker can renew an active lease during long-running inference."""
    session = await OrchestratorService.create_session(
        db_session, user_id=test_user.id, track="System Design", title="Heartbeat Test"
    )
    session_id = session.id
    turn_id = f"turn-heartbeat-{uuid.uuid4()}"

    res = await OrchestratorService.reserve_turn(
        db_session, session_id=session_id, user_id=test_user.id,
        expected_turn_index=0, client_turn_id=turn_id,
        candidate_text="Heartbeat test payload",
        lease_duration_seconds=20,
    )
    token = res["fencing_token"]
    orig_expires = res["expires_at"]

    # Renew lease with 40s extension
    renewed = await OrchestratorService.renew_turn_lease(
        db_session, session_id=session_id, user_id=test_user.id,
        expected_turn_index=0, fencing_token=token, extension_seconds=40,
    )
    assert renewed is True

    refreshed = await OrchestratorService.get_session(db_session, session_id, test_user.id)
    assert refreshed.in_flight_expires_at > orig_expires

    # Attempt renewal with stale fencing token should fail
    stale_renewed = await OrchestratorService.renew_turn_lease(
        db_session, session_id=session_id, user_id=test_user.id,
        expected_turn_index=0, fencing_token=token + 99, extension_seconds=40,
    )
    assert stale_renewed is False


@pytest.mark.asyncio
async def test_ownership_enforcement(test_user: User, second_test_user: User, db_session: AsyncSession):
    """Verify that User B cannot access, reserve, or commit on User A's session."""
    session_a = await OrchestratorService.create_session(
        db_session, user_id=test_user.id, track="System Design", title="User A Session"
    )

    # User B attempts to reserve turn on User A's session
    with pytest.raises(HTTPException) as exc_res:
        await OrchestratorService.reserve_turn(
            db_session, session_id=session_a.id, user_id=second_test_user.id,
            expected_turn_index=0, client_turn_id=f"turn-{uuid.uuid4()}",
            candidate_text="Unauthorized probe",
        )
    assert exc_res.value.status_code == 404

    # User B attempts to commit turn on User A's session
    with pytest.raises(HTTPException) as exc_com:
        await OrchestratorService.commit_turn(
            db_session, session_id=session_a.id, user_id=second_test_user.id,
            expected_turn_index=0, fencing_token=0,
            client_turn_id=f"turn-{uuid.uuid4()}",
            candidate_text="Unauthorized probe",
            assistant_response="Unauthorized response",
        )
    assert exc_com.value.status_code == 404


@pytest.mark.asyncio
async def test_crash_recovery_same_payload(test_user: User, db_session: AsyncSession):
    """Verify that if a worker crashes before commit, an identical retry after lease expiry recovers cleanly."""
    session = await OrchestratorService.create_session(
        db_session, user_id=test_user.id, track="System Design", title="Crash Recovery Test"
    )
    session_id = session.id
    turn_id = f"turn-crash-{uuid.uuid4()}"
    candidate_text = "I propose an event-driven Kafka architecture"

    # 1. Initial reservation
    res1 = await OrchestratorService.reserve_turn(
        db_session, session_id=session_id, user_id=test_user.id,
        expected_turn_index=0, client_turn_id=turn_id,
        candidate_text=candidate_text, lease_duration_seconds=10,
    )
    assert res1["fencing_token"] == 1
    assert res1["is_cached_replay"] is False

    # 2. Worker crashes (does not commit). Fast-forward time past 10s lease.
    past_time = datetime.now(timezone.utc) - timedelta(seconds=30)
    await db_session.execute(
        text("UPDATE orchestrator_sessions SET in_flight_expires_at = :past WHERE id = :id"),
        {"past": past_time, "id": session_id},
    )
    await db_session.commit()

    # 3. Client retries with same client_turn_id and candidate_text.
    # Worker 2 successfully reclaims the expired lease and gets fencing_token 2.
    res2 = await OrchestratorService.reserve_turn(
        db_session, session_id=session_id, user_id=test_user.id,
        expected_turn_index=0, client_turn_id=turn_id,
        candidate_text=candidate_text, lease_duration_seconds=45,
    )
    assert res2["fencing_token"] == 2
    assert res2["is_cached_replay"] is False

    # 4. Worker 2 successfully commits the turn.
    committed = await OrchestratorService.commit_turn(
        db_session, session_id=session_id, user_id=test_user.id,
        expected_turn_index=0, fencing_token=res2["fencing_token"],
        client_turn_id=turn_id, candidate_text=candidate_text,
        assistant_response="How do you handle consumer group rebalancing in Kafka?",
    )
    assert committed.turn_index == 1
    assert committed.fencing_token == 3
    assert len(committed.transcript) == 2

