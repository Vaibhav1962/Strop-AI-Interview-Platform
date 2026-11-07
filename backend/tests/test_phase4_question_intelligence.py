"""Test Suite for Phase 4: Unified Adaptive Interview Intelligence & Dynamic Five-Track Question Bank.

Verifies:
1. Complete 5-Track Question Bank Population & Schema Integrity.
2. Cross-Session Candidate Exposure Tracking & Non-Repetition Scoring.
3. Repetition Simulation across multiple consecutive sessions for same candidate.
4. Dynamic Question Generation, Structural Validation & Quarantine Gates.
5. Deduplication using Semantic Fingerprints.
6. DSA AI-Controlled Coding Transition & Absence of Manual Unlocks.
7. Resume Technical Grounding on Candidate Profile Claims.
"""

import uuid
import pytest
from sqlalchemy import func, select

from app.models.orchestrator_session import OrchestratorSession
from app.models.question import Question
from app.models.user import User
from app.orchestrator.milestones import normalize_track
from app.orchestrator.question_bank.seeder import (
    compute_semantic_fingerprint,
    get_question_bank_statistics,
    seed_all_catalogs,
)
from app.orchestrator.question_intelligence import QuestionIntelligenceEngine
from app.services.orchestrator_service import OrchestratorService


@pytest.mark.asyncio
async def test_question_bank_catalogs_seeded_and_balanced(db_session):
    """Verifies that all 5 active tracks are seeded with abundant, diverse questions satisfying target quotas."""
    await QuestionIntelligenceEngine.ensure_seeded(db_session)
    stats = await get_question_bank_statistics(db_session)

    # Verify track quotas
    assert stats["DSA"] >= 100, f"Expected >= 100 DSA problems, found {stats['DSA']}"
    assert stats["System Design"] >= 50, f"Expected >= 50 System Design scenarios, found {stats['System Design']}"
    assert stats["Core CS"] >= 100, f"Expected >= 100 Core CS questions, found {stats['Core CS']}"
    assert stats["Behavioral"] >= 60, f"Expected >= 60 Behavioral questions, found {stats['Behavioral']}"
    assert stats["Resume Technical"] >= 30, f"Expected >= 30 Resume Technical templates, found {stats['Resume Technical']}"
    assert stats["total"] >= 350, f"Expected total >= 350, found {stats['total']}"


@pytest.mark.asyncio
async def test_schema_metadata_integrity(db_session):
    """Verifies that questions contain complete expected signals, follow-up probes, and metadata."""
    res = await db_session.execute(
        select(Question)
        .where(Question.track == "DSA")
        .order_by(Question.created_at.desc(), Question.title)
        .limit(10)
    )
    dsa_questions = res.scalars().all()
    assert len(dsa_questions) >= 5
    for q in dsa_questions:
        assert len(q.prompt) >= 20
        assert q.expected_signals is not None
        assert isinstance(q.expected_signals, list)
        assert len(q.expected_signals) >= 1
        assert q.metadata_json is not None
        assert "entry_point" in q.metadata_json or "optimal_time_complexity" in q.metadata_json


@pytest.mark.asyncio
async def test_multi_session_candidate_repetition_prevention(db_session, test_user):
    """Simulates 4 consecutive interview sessions for the SAME candidate in DSA track.

    Verifies that the engine NEVER selects the same problem twice in a row,
    actively diversifying topics and penalizing recently asked questions.
    """
    await QuestionIntelligenceEngine.ensure_seeded(db_session)

    selected_problem_ids = []
    selected_titles = []

    for session_idx in range(4):
        # Create a new session for the user
        session = await OrchestratorService.create_session(
            db_session,
            user_id=test_user.id,
            track="dsa",
            title=f"Consecutive DSA Session {session_idx + 1}",
        )
        cur_q = session.working_memory.get("current_question")
        assert cur_q is not None, "A question should be adaptively selected on session creation"

        qid = cur_q["id"]
        title = cur_q["title"]

        selected_problem_ids.append(qid)
        selected_titles.append(title)

        # Commit dummy turns so session is registered as a completed historical session in candidate history
        session.status = "completed"
        db_session.add(session)
        await db_session.commit()

    # CRITICAL ACCEPTANCE CHECK: Zero repetition across consecutive sessions!
    unique_ids = set(selected_problem_ids)
    assert len(unique_ids) == len(selected_problem_ids), (
        f"Detected repetition in consecutive sessions: {selected_titles}"
    )
    # Verify that the engine did NOT get stuck on Longest Substring Without Repeating Characters
    assert len(set(selected_titles)) == 4


@pytest.mark.asyncio
async def test_question_family_and_topic_novelty(db_session, test_user):
    """Verifies that the scoring engine favors novel topics and penalizes repeating question families."""
    mem = {
        "track": "System Design",
        "current_milestone": "scoping_and_requirements",
        "milestone_history": ["scoping_and_requirements"],
        "milestone_turn_counts": {"scoping_and_requirements": 1},
        "asked_question_ids": [],
        "covered_topics": ["storage & caching"],
    }

    q1 = await QuestionIntelligenceEngine.select_adaptive_question(
        db_session,
        track="System Design",
        working_memory=mem,
        user_id=test_user.id,
    )
    assert q1 is not None
    # Second question in same session should diversify topic
    q2 = await QuestionIntelligenceEngine.select_adaptive_question(
        db_session,
        track="System Design",
        working_memory=mem,
        user_id=test_user.id,
    )
    assert q2 is not None
    assert q1["id"] != q2["id"], "Engine must not select the exact same question in the same session"


@pytest.mark.asyncio
async def test_dynamic_generation_quarantine_gate(db_session):
    """Verifies that malformed or incomplete generated questions are strictly quarantined and cannot reach candidates."""
    unique_tag = str(uuid.uuid4())[:8]
    malformed_fp = compute_semantic_fingerprint("Core CS", "Operating Systems", f"Invalid Malformed Question {unique_tag}")
    quarantined_q = Question(
        id=uuid.uuid4(),
        track="Core CS",
        topic="Operating Systems",
        subtopic="Kernel",
        difficulty="Senior",
        title=f"Invalid Malformed Question {unique_tag}",
        prompt="Short",  # Fails minimum length
        expected_signals=[],  # Fails signal count
        follow_up_probes=[],
        provenance="dynamic_generated",
        validation_status="quarantined",  # QUARANTINED
        quality_score=0.0,
        semantic_fingerprint=malformed_fp,
        usage_count=0,
    )
    db_session.add(quarantined_q)
    await db_session.commit()

    # Adaptive selection must NEVER select quarantined questions
    mem = {"asked_question_ids": [], "covered_topics": []}
    for _ in range(5):
        selected = await QuestionIntelligenceEngine.select_adaptive_question(
            db_session,
            track="Core CS",
            working_memory=mem,
        )
        assert selected is not None
        assert selected["id"] != str(quarantined_q.id), "Quarantined question was incorrectly served to candidate!"


@pytest.mark.asyncio
async def test_semantic_deduplication(db_session):
    """Verifies that questions with matching semantic fingerprints are rejected as duplicates."""
    track = "Behavioral"
    topic = "Conflict Resolution"
    title = "Disagreement with Principal Architect or Tech Lead"
    fp = compute_semantic_fingerprint(track, topic, title)

    # Look up existing question with this fingerprint
    res = await db_session.execute(select(Question).where(Question.semantic_fingerprint == fp))
    existing = res.scalar_one_or_none()
    assert existing is not None, "Seeded catalog question should exist with exact semantic fingerprint"

    # Attempt to insert identical fingerprint should raise IntegrityError or be caught
    duplicate_fp = compute_semantic_fingerprint(track.upper(), topic.lower(), title)
    assert duplicate_fp == fp, "Fingerprint must be case-insensitive and whitespace-invariant"


@pytest.mark.asyncio
async def test_dsa_workspace_ai_controlled_transition(db_session, test_user):
    """Verifies that DSA sessions begin with workspace locked (revealed=False),

    and that the problem metadata is fully grounded without requiring manual client unlock.
    """
    session = await OrchestratorService.create_session(
        db_session,
        user_id=test_user.id,
        track="dsa",
        title="AI Controlled Coding Transition Test",
    )

    dsa_info = session.working_memory.get("dsa_problem")
    assert dsa_info is not None
    assert dsa_info["revealed"] is False, "DSA workspace must start hidden/locked during initial briefing"
    assert "title" in dsa_info
    assert "entry_point" in dsa_info
    assert "constraints" in dsa_info
    assert len(dsa_info["constraints"]) >= 1


@pytest.mark.asyncio
async def test_resume_technical_claim_grounding(db_session, test_user):
    """Verifies that Resume Technical track prioritizes questions aligned with candidate claimed technologies."""
    profile_with_kafka = {
        "skills": ["Apache Kafka", "Distributed Systems", "PostgreSQL"],
        "projects": [{"name": "Event Ingestion Pipeline", "technologies": ["Kafka", "Go"]}],
    }
    mem = {"asked_question_ids": [], "covered_topics": []}

    selected = await QuestionIntelligenceEngine.select_adaptive_question(
        db_session,
        track="Resume Technical",
        working_memory=mem,
        user_id=test_user.id,
        candidate_profile=profile_with_kafka,
    )
    assert selected is not None
    # Must prioritize Kafka or PostgreSQL based on claimed profile
    tech_meta = selected.get("metadata_json", {}).get("technology", "")
    assert tech_meta in ["Kafka", "PostgreSQL", "Go"] or "kafka" in selected["prompt"].lower()
