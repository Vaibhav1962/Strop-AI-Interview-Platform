"""Integration tests for Master Corrective Cycle:
1. DSA Problem reveal lifecycle, immutability, and session persistence.
2. Async evaluation timeout recovery and server restart recovery.
3. Skill extractor deterministic boundaries.
"""

import pytest
from datetime import datetime, timezone, timedelta
from app.models.orchestrator_session import OrchestratorSession
from app.models.user import User
from app.services.orchestrator_service import OrchestratorService
from app.orchestrator.skill_extractor import extract_verified_skills


@pytest.mark.asyncio
async def test_dsa_problem_lifecycle_and_immutability(db_session, test_user):
    """Verifies DSA problem is unrevealed at Turn 0, revealed at Turn 1, and immutable."""
    # 1. Create DSA session with specific problem_id
    session = await OrchestratorService.create_session(
        db_session,
        user_id=test_user.id,
        track="dsa",
        title="DSA Algorithmic Calibration",
        problem_id="longest-substring",
    )
    assert session.track == "DSA"
    assert "dsa_problem" in session.working_memory
    dsa_meta = session.working_memory["dsa_problem"]
    assert dsa_meta["id"] == "longest-substring"
    assert dsa_meta["revealed"] is False
    assert dsa_meta["revealed_at_turn"] is None

    # 2. Verify get_session returns unrevealed state
    fetched = await OrchestratorService.get_session(db_session, session.id, test_user.id)
    assert fetched.working_memory["dsa_problem"]["revealed"] is False

    # 3. Simulate Turn 1 transition in Supervisor (reassigning working_memory)
    updated_memory = dict(session.working_memory)
    updated_memory["dsa_problem"] = dict(updated_memory["dsa_problem"])
    updated_memory["dsa_problem"]["revealed"] = True
    updated_memory["dsa_problem"]["revealed_at_turn"] = 1
    session.working_memory = updated_memory
    session.turn_index = 1
    db_session.add(session)
    await db_session.commit()

    # 4. Re-fetch session across simulated refresh: verify revealed state is persistent and problem_id is identical
    refreshed = await OrchestratorService.get_session(db_session, session.id, test_user.id)
    assert refreshed.working_memory["dsa_problem"]["revealed"] is True
    assert refreshed.working_memory["dsa_problem"]["id"] == "longest-substring"
    assert refreshed.working_memory["dsa_problem"]["revealed_at_turn"] == 1


@pytest.mark.asyncio
async def test_async_evaluation_timeout_recovery(db_session, test_user):
    """Verifies that an evaluation stuck in 'processing' beyond 180s transitions to 'failed' gracefully."""
    session = await OrchestratorService.create_session(
        db_session,
        user_id=test_user.id,
        track="system-design",
        title="Timeout Recovery Test",
    )

    # Set evaluation_status = 'processing' with updated_at > 180s ago
    session.evaluation_status = "processing"
    session.updated_at = datetime.now(timezone.utc) - timedelta(seconds=200)
    db_session.add(session)
    await db_session.commit()

    # get_session_status should detect timeout and transition to failed
    status_dict = await OrchestratorService.get_session_status(db_session, session.id, test_user.id)
    assert status_dict["evaluation_status"] == "failed"
    assert "timed out" in status_dict["evaluation_error"].lower()

    # Verify database state was updated
    refreshed = await OrchestratorService.get_session(db_session, session.id, test_user.id)
    assert refreshed.evaluation_status == "failed"


def test_skill_extractor_python_precision():
    """Verifies that common false positives like 'Go from 0 to 1' and 'Grade C' are cleanly rejected."""
    false_pos_text = """
    Helped the team go from 0 to 1 in product development.
    Good understanding of algorithms and ongoing initiatives.
    We are going to implement scalable solutions.
    Graduated with Grade C in math.
    Worked in R&D division.
    Chemical reaction speedup.
    """
    extracted = extract_verified_skills(false_pos_text)
    assert "Go" not in extracted
    assert "C" not in extracted
    assert "R" not in extracted
    assert extracted == []

    true_pos_text = """
    SKILLS:
    Languages: Python, Go, C++, Rust, TypeScript, C, R
    Frameworks: React, Next.js, FastAPI
    Databases & Tools: PostgreSQL, Redis, Kafka, Docker, Kubernetes, AWS

    EXPERIENCE:
    Built microservices in Go and Python using PostgreSQL and Redis.
    """
    extracted_true = extract_verified_skills(true_pos_text)
    assert "Python" in extracted_true
    assert "Go" in extracted_true
    assert "C++" in extracted_true
    assert "Rust" in extracted_true
    assert "TypeScript" in extracted_true
    assert "C" in extracted_true
    assert "R" in extracted_true
    assert "PostgreSQL" in extracted_true
    assert "Redis" in extracted_true
    assert "Docker" in extracted_true
    assert "Kubernetes" in extracted_true
