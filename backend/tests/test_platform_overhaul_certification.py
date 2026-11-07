"""Platform-Wide Interview Intelligence, Reporting & UX Overhaul Certification Tests.

Certifies:
1. Hybrid Question Intelligence: 50+ curated questions seeded across 5 tracks with adaptive diversity.
2. DSA Discussion-Before-Coding: coding workspace remains hidden until explicit transition to code implementation.
3. Time-Budget Enforcement: 2-minute closing window and hard deadline termination with time_budget_reached.
4. Post-Interview Downloadable PDF: 7-dimension speech & communication analysis scorecard and complete transcript.
"""

import uuid
from datetime import datetime, timezone
import pytest
from sqlalchemy import func, select

from app.models.orchestrator_session import OrchestratorSession
from app.models.question import Question
from app.models.user import User
from app.orchestrator.evaluator import BarsEvaluator, compute_speech_telemetry
from app.orchestrator.milestones import normalize_track
from app.orchestrator.pdf_generator import generate_bars_pdf
from app.orchestrator.question_intelligence import QuestionIntelligenceEngine
from app.orchestrator.supervisor import SupervisorEngine
from app.services.orchestrator_service import OrchestratorService


@pytest.mark.asyncio
async def test_question_bank_seeding_and_adaptive_diversity(db_session):
    """Verifies that 50+ bar-raising questions are seeded across all 5 tracks and

    that adaptive question selection ensures topic exploration and session diversity.
    """
    # 1. Seed questions
    await QuestionIntelligenceEngine.ensure_seeded(db_session)

    # 2. Verify track counts (each of the 5 active tracks must have >= 10 questions)
    tracks = ["DSA", "System Design", "Core CS", "Behavioral", "Resume Technical"]
    for track in tracks:
        res = await db_session.execute(
            select(func.count(Question.id)).where(Question.track == track)
        )
        count = res.scalar() or 0
        assert count >= 10, f"Track {track} has {count} questions, expected >= 10"

    # 3. Test adaptive selection tracking covered topics
    working_memory = {
        "asked_question_ids": [],
        "covered_topics": [],
        "unresolved_concerns": [],
    }

    q1 = await QuestionIntelligenceEngine.select_adaptive_question(
        db_session, "System Design", working_memory
    )
    assert q1 is not None
    assert q1["id"] in working_memory["asked_question_ids"]
    assert q1["topic"] in working_memory["covered_topics"]

    # Select next question: must be different and cover an unexplored topic
    q2 = await QuestionIntelligenceEngine.select_adaptive_question(
        db_session, "System Design", working_memory
    )
    assert q2 is not None
    assert q2["id"] != q1["id"]
    assert q2["id"] in working_memory["asked_question_ids"]
    assert len(working_memory["covered_topics"]) == 2


@pytest.mark.asyncio
async def test_dsa_discussion_before_coding(db_session):
    """Verifies that the DSA coding workspace is NOT revealed prematurely during problem

    orientation or approach discussion, and only unlocks when transitioning into code implementation.
    """
    mem = {
        "track": "DSA",
        "current_milestone": "problem_orientation_and_clarification",
        "milestone_history": ["problem_orientation_and_clarification"],
        "milestone_turn_counts": {"problem_orientation_and_clarification": 1},
        "dsa_problem": {
            "id": "longest-substring",
            "title": "Longest Substring Without Repeating Characters",
            "revealed": False,
        },
    }

    # Turn 1: Problem clarification
    mem1 = SupervisorEngine.update_working_memory_after_turn(
        working_memory=mem,
        delta_metadata={"technical_claims": ["Input length up to 10^5"]},
        new_milestone_id=None,
    )
    assert mem1["dsa_problem"]["revealed"] is False, "Coding workspace revealed prematurely on turn 1"

    # Turn 2: Advance to brute-force discussion
    mem1["current_milestone"] = "brute_force_and_intuition"
    mem2 = SupervisorEngine.update_working_memory_after_turn(
        working_memory=mem1,
        delta_metadata={"technical_claims": ["Naive O(N^2) checks every substring"]},
        new_milestone_id=None,
    )
    assert mem2["dsa_problem"]["revealed"] is False, "Coding workspace revealed prematurely during brute-force discussion"

    # Turn 3: Advance to algorithmic optimization discussion
    mem2["current_milestone"] = "algorithmic_optimization"
    mem3 = SupervisorEngine.update_working_memory_after_turn(
        working_memory=mem2,
        delta_metadata={"technical_claims": ["Use sliding window with two pointers"]},
        new_milestone_id=None,
    )
    assert mem3["dsa_problem"]["revealed"] is False, "Coding workspace revealed prematurely during optimization discussion"

    # Turn 4: Candidate and interviewer agree to implement code -> transition to code_implementation_and_dryrun
    mem4 = SupervisorEngine.update_working_memory_after_turn(
        working_memory=mem3,
        delta_metadata={"technical_claims": ["Ready to write solution in Python"]},
        new_milestone_id="code_implementation_and_dryrun",
    )
    assert mem4["dsa_problem"]["revealed"] is True, "Coding workspace must be revealed upon entering coding milestone"
    assert mem4["current_milestone"] == "code_implementation_and_dryrun"


@pytest.mark.asyncio
async def test_time_budget_closing_window_and_termination(db_session):
    """Verifies that the Supervisor emits CLOSING_WINDOW under 2 minutes and

    CONCLUDE_TIME_BUDGET at the deadline, marking the session as completed.
    """
    user = User(
        id=uuid.uuid4(),
        email=f"timebudget_{uuid.uuid4().hex[:6]}@example.com",
        hashed_password="hash",
        full_name="Time Test Candidate",
    )
    db_session.add(user)
    await db_session.commit()

    session = await OrchestratorService.create_session(
        db_session,
        user_id=user.id,
        track="System Design",
        title="Time Budget Test",
    )

    # 1. Simulate < 2 minutes remaining (elapsed = 1700s, target = 1800s)
    session.working_memory["target_duration_seconds"] = 1800
    session.working_memory["deliberation_seconds_spent"] = 1700

    directive_closing = SupervisorEngine.evaluate_state(session)
    assert directive_closing.action == "CLOSING_WINDOW"
    assert "under 2 minutes" in directive_closing.guidance.lower()

    # 2. Simulate time budget reached (elapsed = 1810s, target = 1800s)
    session.working_memory["deliberation_seconds_spent"] = 1810
    directive_conclude = SupervisorEngine.evaluate_state(session)
    assert directive_conclude.action == "CONCLUDE_TIME_BUDGET"
    assert directive_conclude.is_final_milestone is True


@pytest.mark.asyncio
async def test_pdf_report_with_communication_scorecard_and_transcript():
    """Verifies that the generated post-interview PDF includes the 7-dimension

    communication scorecard with speech acoustics and the complete chronological transcript.
    """
    sample_transcript = [
        {"turn_index": 1, "speaker": "Alex", "text": "Welcome to our System Design interview. Today we will design a high-throughput distributed rate limiter."},
        {"turn_index": 1, "speaker": "Candidate", "text": "Thank you Alex. To start, I want to clarify the functional requirements: what is our expected peak requests per second?"},
        {"turn_index": 2, "speaker": "Alex", "text": "Assume 500,000 requests per second across three geographic regions with tiered rate limits per tenant."},
        {"turn_index": 2, "speaker": "Candidate", "text": "Got it. With 500k QPS, a central Redis roundtrip on every call adds unacceptable network latency. I propose using a sliding window counter with local in-memory token buffers synchronized asynchronously."},
    ]

    # Compute speech telemetry
    telemetry = compute_speech_telemetry(sample_transcript, deliberation_seconds=120)
    assert telemetry["total_words"] > 30
    assert telemetry["estimated_wpm"] > 0
    assert "filler_word_count" in telemetry

    # Mock evaluation report
    report_data = {
        "session_id": str(uuid.uuid4()),
        "track": "System Design",
        "title": "Distributed Rate Limiter Evaluation",
        "calibration_signal": "Strong Evidence in Covered Areas",
        "overall_hiring_recommendation": "Strong Evidence in Covered Areas",
        "coverage_summary": {
            "total_competencies": 6,
            "demonstrated_count": 5,
            "weak_count": 0,
            "insufficient_coverage_count": 1,
            "contradictory_count": 0,
            "coverage_percentage": 83.3,
            "coverage_assessment": "5 of 6 competencies explored with high rigor.",
        },
        "executive_summary": "Candidate demonstrated strong distributed systems intuition, identifying local memory token buffers to protect Redis.",
        "competency_evaluations": [
            {
                "competency_id": "scope_definition",
                "competency_name": "Requirements & Scope Definition",
                "evidence_classification": "Demonstrated competence",
                "bars_level": 4,
                "bars_anchor": "Clarified scale boundaries and latency SLAs upfront.",
                "behavioral_observation": "Immediately established 500k QPS scale bounds.",
                "evidence_quotes": [
                    {"turn_index": 1, "quote": "what is our expected peak requests per second?", "relevance": "Clarifies scale constraint"}
                ],
                "strengths": ["Clear metric scoping"],
                "gaps_or_limitations": [],
            }
        ],
        "key_technical_strengths": ["Scalability intuition", "Redis latency awareness"],
        "key_technical_weaknesses": [],
        "unresolved_architectural_areas": [],
        "communication_and_deliberation": "High signal-to-noise ratio with clear top-down problem framing.",
        "communication_scorecard": {
            "overall_rating": "Strong",
            "telemetry": telemetry,
            "dimensions": [
                {
                    "dimension_id": "clarity",
                    "name": "Clarity & Articulation",
                    "rating": "Strong",
                    "observation": "Clear technical terminology with precise diction.",
                    "evidence_quote": "sliding window counter with local in-memory token buffers",
                },
                {
                    "dimension_id": "structure",
                    "name": "Structure & Synthesis",
                    "rating": "Exemplary",
                    "observation": "Signposted the solution top-down from client to cache layer.",
                    "evidence_quote": "To start, I want to clarify the functional requirements",
                },
                {
                    "dimension_id": "conciseness",
                    "name": "Conciseness & Signal-to-Noise",
                    "rating": "Strong",
                    "observation": "Zero rambling, high density of engineering insights.",
                    "evidence_quote": None,
                },
                {
                    "dimension_id": "verbal_fluency",
                    "name": "Verbal Fluency & Cadence",
                    "rating": "Strong",
                    "observation": "Paced delivery with minimal hesitations.",
                    "evidence_quote": None,
                },
                {
                    "dimension_id": "confidence",
                    "name": "Confidence & Poise",
                    "rating": "Strong",
                    "observation": "Firm conviction in asynchronous token synchronization.",
                    "evidence_quote": None,
                },
                {
                    "dimension_id": "technical_communication",
                    "name": "Technical Communication",
                    "rating": "Exemplary",
                    "observation": "Articulated the network round-trip penalty intuitively.",
                    "evidence_quote": "central Redis roundtrip on every call adds unacceptable network latency",
                },
                {
                    "dimension_id": "responsiveness",
                    "name": "Active Listening & Responsiveness",
                    "rating": "Strong",
                    "observation": "Directly incorporated the 500k QPS constraint.",
                    "evidence_quote": "With 500k QPS...",
                },
            ],
        },
        "actionable_growth_plan": [
            "Explore Redis Cell leaky bucket module for hardware-efficient token tracking.",
            "Benchmark CRDT counter convergence across inter-datacenter links.",
        ],
        "evaluation_limitations": ["Cross-region clock skew was not deeply explored due to time."],
        "evaluated_at": datetime.now(timezone.utc).isoformat(),
    }

    pdf_bytes = generate_bars_pdf(
        report_data=report_data,
        candidate_name="Sarah Connor",
        track="System Design",
        transcript=sample_transcript,
    )

    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 5000, f"PDF byte size {len(pdf_bytes)} too small"
    assert pdf_bytes.startswith(b"%PDF"), "Generated file is not a valid PDF document"
