"""Stage 0.4: Post-Interview Qualitative BARS Evaluation Engine Test Suite.

Verifies:
1. Evidence-based evaluation requiring direct quotes and turn numbers.
2. Strict 4-way evidence taxonomy:
   - 'Demonstrated competence'
   - 'Weak evidence'
   - 'Insufficient coverage' (with bars_level=None and no candidate penalty)
   - 'Contradictory evidence'
3. Actionable growth plan and evaluation limitations.
4. Database persistence and retrieval via OrchestratorService.
"""

import json
import uuid
import pytest
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.orchestrator_session import OrchestratorSession
from app.models.user import User
from app.orchestrator.evaluator import BarsEvaluator
from app.schemas.orchestrator import (
    BarsEvaluationReport,
    CompetencyEvaluation,
    EvidenceClassification,
    EvidenceQuote,
)
from app.services.orchestrator_service import OrchestratorService


class MockBarsEvaluator(BarsEvaluator):
    """Predictable mock evaluator for deterministic testing of BARS schema and persistence."""

    def __init__(self, scripted_report: BarsEvaluationReport | None = None):
        super().__init__()
        self.scripted_report = scripted_report

    async def evaluate_session(self, session: OrchestratorSession) -> BarsEvaluationReport:
        if self.scripted_report:
            return self.scripted_report

        # Generate realistic evidence-based report from session transcript
        transcript = session.transcript or []
        first_candidate_quote = ""
        first_turn_idx = 0
        for entry in transcript:
            if entry.get("speaker") == "Candidate":
                first_candidate_quote = entry.get("text", "")[:100]
                first_turn_idx = entry.get("turn_index", 0)
                break

        return BarsEvaluationReport(
            session_id=session.id,
            track=session.track,
            title=session.title,
            overall_hiring_recommendation="Hire",
            executive_summary=(
                "The candidate demonstrated strong Staff-level competence in distributed consistency, "
                "correctly identifying the Transactional Outbox pattern to eliminate dual-write hazards. "
                "Ingress rate-limiting and database sharding were articulated soundly."
            ),
            competency_evaluations=[
                CompetencyEvaluation(
                    competency_id="scope_and_quantitative_estimation",
                    competency_name="Scope Framing & Quantitative Sizing",
                    evidence_classification=EvidenceClassification.DEMONSTRATED_COMPETENCE,
                    bars_level=3,
                    bars_anchor="Level 3: Computes throughput, bandwidth, and storage needs; articulates separate SLAs.",
                    behavioral_observation="Quantified write throughput at 5,000 TPS with sub-500ms p99 latency SLA.",
                    evidence_quotes=[
                        EvidenceQuote(
                            turn_index=first_turn_idx,
                            speaker="Candidate",
                            quote=first_candidate_quote or "5,000 peak write transactions per second",
                            relevance="Explicit quantitative throughput target articulated upfront.",
                        )
                    ],
                    strengths=["Clear separation of read/write SLAs", "Realistic p99 latency targets"],
                    gaps_or_limitations=["Did not calculate network bandwidth or storage growth over 3 years"],
                ),
                CompetencyEvaluation(
                    competency_id="distributed_consistency_and_transactions",
                    competency_name="Distributed Consistency, Idempotency & Transactions",
                    evidence_classification=EvidenceClassification.DEMONSTRATED_COMPETENCE,
                    bars_level=4,
                    bars_anchor="Level 4: Anticipates dual-write inconsistencies; implements the Transactional Outbox pattern with CDC.",
                    behavioral_observation="Identified split-brain hazard in Redis TTL and proposed Transactional Outbox with Debezium CDC.",
                    evidence_quotes=[
                        EvidenceQuote(
                            turn_index=first_turn_idx,
                            speaker="Candidate",
                            quote="Transactional Outbox pattern: payment record and outbox event committed in same Postgres ACID transaction",
                            relevance="Eliminates distributed dual-write inconsistency between database and Kafka.",
                        )
                    ],
                    strengths=["Transactional Outbox pattern", "Unique constraint on (merchant_id, idempotency_key)"],
                    gaps_or_limitations=[],
                ),
                CompetencyEvaluation(
                    competency_id="resilience_and_failure_recovery",
                    competency_name="Resilience, Failover & Failure Recovery",
                    evidence_classification=EvidenceClassification.INSUFFICIENT_COVERAGE,
                    bars_level=None,
                    bars_anchor="Unassessed due to insufficient interview coverage",
                    behavioral_observation="The interviewer did not allocate sufficient time to probe multi-region failover or network partitions.",
                    evidence_quotes=[],
                    strengths=[],
                    gaps_or_limitations=["Unassessed: Not probed during this interview"],
                ),
            ],
            key_technical_strengths=[
                "Strong grasp of distributed transactional consistency (Transactional Outbox)",
                "Clear understanding of idempotency state machines",
            ],
            key_technical_weaknesses=[
                "Initial reliance on 1-hour Redis TTL before self-correcting when probed",
            ],
            unresolved_architectural_areas=[
                "CDC worker crash recovery and deduplication at-least-once edge cases",
            ],
            communication_and_deliberation=(
                "Excellent intellectual honesty. Readily accepted interviewer feedback regarding Redis TTL risks "
                "and articulated a principled recovery without defensiveness."
            ),
            actionable_growth_plan=[
                "Study Debezium CDC connector offset management and Kafka partition rebalancing behavior.",
                "Practice calculating long-term cold storage retention and archival cost for high-TPS financial ledgers.",
            ],
            evaluation_limitations=[
                "Multi-region active-active disaster recovery was not probed due to interview time constraints.",
            ],
            evaluated_at=datetime.now(timezone.utc).isoformat(),
        )


@pytest.mark.asyncio
async def test_bars_evaluation_demonstrated_competence_and_quotes(test_user: User, db_session: AsyncSession):
    """Verifies that demonstrated competence includes exact transcript quotes and turn references."""
    session = await OrchestratorService.create_session(
        db_session, user_id=test_user.id, track="System Design", title="BARS Evaluation Test"
    )

    # Seed transcript
    session.transcript = [
        {
            "turn_index": 0,
            "speaker": "Candidate",
            "text": "I design this for 5,000 peak write transactions per second with sub-500ms p99 SLA.",
        },
        {
            "turn_index": 0,
            "speaker": "Alex",
            "text": "How do you handle consistency under partition?",
        },
    ]
    await db_session.commit()

    evaluator = MockBarsEvaluator()
    report = await OrchestratorService.evaluate_session(
        db_session, session_id=session.id, user_id=test_user.id, evaluator=evaluator
    )

    assert report.overall_hiring_recommendation == "Hire"
    assert len(report.competency_evaluations) >= 3

    # Check demonstrated competence competency
    comp0 = report.competency_evaluations[0]
    assert comp0.evidence_classification == EvidenceClassification.DEMONSTRATED_COMPETENCE
    assert comp0.bars_level == 3
    assert len(comp0.evidence_quotes) > 0
    assert comp0.evidence_quotes[0].turn_index == 0
    assert "5,000" in comp0.evidence_quotes[0].quote


@pytest.mark.asyncio
async def test_bars_evaluation_insufficient_coverage_no_penalty(test_user: User, db_session: AsyncSession):
    """Verifies that unprobed competencies are marked INSUFFICIENT_COVERAGE with bars_level=None and no score penalty."""
    session = await OrchestratorService.create_session(
        db_session, user_id=test_user.id, track="System Design", title="Coverage Test"
    )
    session.transcript = [
        {"turn_index": 0, "speaker": "Candidate", "text": "Basic introductory statement."},
    ]
    await db_session.commit()

    evaluator = MockBarsEvaluator()
    report = await OrchestratorService.evaluate_session(
        db_session, session_id=session.id, user_id=test_user.id, evaluator=evaluator
    )

    unassessed_comp = next(
        c for c in report.competency_evaluations if c.evidence_classification == EvidenceClassification.INSUFFICIENT_COVERAGE
    )
    assert unassessed_comp.bars_level is None
    assert "insufficient" in unassessed_comp.bars_anchor.lower()
    # Ensure limitations explicitly document unassessed areas
    assert len(report.evaluation_limitations) > 0


@pytest.mark.asyncio
async def test_bars_evaluation_persistence_and_retrieval(test_user: User, db_session: AsyncSession):
    """Verifies that evaluation report is saved into PostgreSQL working_memory and retrieved cleanly."""
    session = await OrchestratorService.create_session(
        db_session, user_id=test_user.id, track="System Design", title="Persistence Test"
    )
    session.transcript = [
        {"turn_index": 0, "speaker": "Candidate", "text": "PostgreSQL with Transactional Outbox pattern."},
    ]
    await db_session.commit()

    evaluator = MockBarsEvaluator()
    created_report = await OrchestratorService.evaluate_session(
        db_session, session_id=session.id, user_id=test_user.id, evaluator=evaluator
    )

    # Re-fetch via get_session_evaluation
    retrieved_dict = await OrchestratorService.get_session_evaluation(
        db_session, session_id=session.id, user_id=test_user.id
    )
    assert retrieved_dict is not None
    assert retrieved_dict["overall_hiring_recommendation"] == created_report.overall_hiring_recommendation
    assert retrieved_dict["session_id"] == str(session.id)

    # Verify session status transitioned to 'completed'
    refreshed_session = await OrchestratorService.get_session(db_session, session.id, test_user.id)
    assert refreshed_session.status == "completed"


def test_bars_sanitizer_enforces_invariants():
    """Verifies that the sanitizer deterministically catches and fixes misclassified unprobed competencies."""
    dummy_session = OrchestratorSession(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        title="Sanitizer Test",
        track="System Design",
        status="completed",
        turn_index=2,
        fencing_token=2,
        transcript=[],
        working_memory={},
    )

    # Raw LLM output with a common flaw: marked "Weak evidence" but observation says "not explored" and has 0 quotes
    flawed_llm_json = {
        "session_id": str(dummy_session.id),
        "track": "System Design",
        "title": "Sanitizer Test",
        "overall_hiring_recommendation": "Hire",
        "executive_summary": "Test summary",
        "competency_evaluations": [
            {
                "competency_id": "tradeoff_analysis_and_retrospective",
                "competency_name": "Trade-Off Analysis & Retrospective Reasoning",
                "evidence_classification": "Weak evidence",  # Flawed classification
                "bars_level": 2,  # Flawed level
                "bars_anchor": "Level 2: Mentions CAP theorem superficially",
                "behavioral_observation": "The candidate was not explored on trade-offs due to interview time limits.",
                "evidence_quotes": [],  # Zero quotes
                "strengths": [],
                "gaps_or_limitations": ["Not explored"],
            },
            {
                "competency_id": "scope_and_quantitative_estimation",
                "competency_name": "Scope Framing & Quantitative Sizing",
                "evidence_classification": "Demonstrated competence",
                "bars_level": 3,
                "bars_anchor": "Level 3: Computes throughput and SLAs",
                "behavioral_observation": "Provided solid 5,000 TPS estimate.",
                "evidence_quotes": [
                    {
                        "turn_index": 0,
                        "speaker": "Candidate",
                        "quote": "5,000 peak TPS",
                        "relevance": "Direct throughput estimate",
                    }
                ],
                "strengths": ["Clear sizing"],
                "gaps_or_limitations": [],
            },
        ],
        "key_technical_strengths": ["Sizing"],
        "key_technical_weaknesses": [],
        "unresolved_architectural_areas": [],
        "communication_and_deliberation": "Clear communication",
        "actionable_growth_plan": ["Study trade-offs"],
        "evaluation_limitations": ["Limited interview turns"],
        "evaluated_at": datetime.now(timezone.utc).isoformat(),
    }

    report = BarsEvaluator.sanitize_and_validate_report(flawed_llm_json, dummy_session)

    # Invariant check: Trade-off analysis was corrected from Weak evidence to Insufficient coverage
    tradeoff_comp = next(
        c for c in report.competency_evaluations if c.competency_id == "tradeoff_analysis_and_retrospective"
    )
    assert tradeoff_comp.evidence_classification == EvidenceClassification.INSUFFICIENT_COVERAGE
    assert tradeoff_comp.bars_level is None
    assert tradeoff_comp.bars_anchor == "Unassessed due to insufficient interview coverage"
    assert len(tradeoff_comp.evidence_quotes) == 0

    # Invariant check: Coverage summary reflects true unassessed count
    assert report.coverage_summary.insufficient_coverage_count == 1
    assert report.coverage_summary.demonstrated_count == 1


@pytest.mark.asyncio
async def test_bars_evaluation_idempotency_returns_cached_report(test_user: User, db_session: AsyncSession):
    """Verifies that calling evaluate_session repeatedly returns cached evaluation without re-evaluating."""
    session = await OrchestratorService.create_session(
        db_session, user_id=test_user.id, track="System Design", title="Idempotency Test"
    )
    session.transcript = [
        {"turn_index": 0, "speaker": "Candidate", "text": "Sharded PostgreSQL with Raft consensus."},
    ]
    await db_session.commit()

    call_count = 0

    class CountingEvaluator(BarsEvaluator):
        async def evaluate_session(self, sess: OrchestratorSession) -> BarsEvaluationReport:
            nonlocal call_count
            call_count += 1
            return BarsEvaluationReport(
                session_id=sess.id,
                track=sess.track,
                title=sess.title,
                overall_hiring_recommendation="Hire",
                executive_summary="Solid performance.",
                competency_evaluations=[],
                communication_and_deliberation="Clear communication.",
                evaluated_at=datetime.now(timezone.utc).isoformat(),
            )

    evaluator = CountingEvaluator()

    # Call 1: First evaluation executes evaluator
    report1 = await OrchestratorService.evaluate_session(
        db_session, session_id=session.id, user_id=test_user.id, evaluator=evaluator
    )
    assert call_count == 1
    assert report1.executive_summary == "Solid performance."

    # Call 2: Second evaluation retrieves cached report directly without calling evaluator
    report2 = await OrchestratorService.evaluate_session(
        db_session, session_id=session.id, user_id=test_user.id, evaluator=evaluator
    )
    assert call_count == 1
    assert report2.executive_summary == report1.executive_summary
    assert report2.session_id == report1.session_id


@pytest.mark.asyncio
async def test_bars_evaluation_syncs_to_interview_sessions(test_user: User, db_session: AsyncSession):
    """Verifies that evaluate_session synchronizes the completed BARS report to legacy interview_sessions."""
    from app.models.interview_session import InterviewSession

    session = await OrchestratorService.create_session(
        db_session, user_id=test_user.id, track="System Design", title="Sync Legacy Test"
    )
    session.transcript = [
        {"turn_index": 0, "speaker": "Candidate", "text": "Outbox pattern with Kafka and PostgreSQL."},
    ]
    await db_session.commit()

    evaluator = MockBarsEvaluator()
    created_report = await OrchestratorService.evaluate_session(
        db_session, session_id=session.id, user_id=test_user.id, evaluator=evaluator
    )

    # Query legacy interview_sessions table with same session ID
    legacy_session = await db_session.get(InterviewSession, session.id)
    assert legacy_session is not None
    assert legacy_session.id == session.id
    assert legacy_session.competency_level == created_report.calibration_signal.value
    assert legacy_session.report is not None
    assert legacy_session.report["session_id"] == str(session.id)
    assert legacy_session.report["calibration_signal"] == created_report.calibration_signal.value


def test_early_ended_session_calibrates_as_inconclusive():
    """Verifies that a candidate ending after minimal turns receives 'Inconclusive Due to Limited Coverage'."""
    dummy_session = OrchestratorSession(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        title="Early Exit Test",
        track="System Design",
        status="in_progress",
        turn_index=1,
        fencing_token=1,
        transcript=[
            {"turn_index": 0, "speaker": "Candidate", "text": "We need around 5,000 TPS."}
        ],
        working_memory={},
    )

    # Only 1 competency covered, 5 unassessed
    raw_early_json = {
        "session_id": str(dummy_session.id),
        "track": "System Design",
        "title": "Early Exit Test",
        "overall_hiring_recommendation": "Inconclusive",
        "executive_summary": "Session ended early after 1 turn.",
        "competency_evaluations": [
            {
                "competency_id": "scope_and_quantitative_estimation",
                "competency_name": "Scope Framing & Quantitative Sizing",
                "evidence_classification": "Demonstrated competence",
                "bars_level": 3,
                "bars_anchor": "Level 3: Computes throughput and SLAs",
                "behavioral_observation": "Stated 5,000 TPS.",
                "evidence_quotes": [
                    {"turn_index": 0, "speaker": "Candidate", "quote": "5,000 TPS", "relevance": "Sizing target"}
                ],
                "strengths": ["Basic sizing"],
                "gaps_or_limitations": [],
            },
            {
                "competency_id": "system_architecture_and_data_flow",
                "competency_name": "High-Level Architecture & Ingress",
                "evidence_classification": "Insufficient coverage",
                "bars_level": None,
                "bars_anchor": "Unassessed",
                "behavioral_observation": "Not explored due to early exit.",
                "evidence_quotes": [],
                "strengths": [],
                "gaps_or_limitations": [],
            },
            {
                "competency_id": "data_modeling_and_storage",
                "competency_name": "Data Modeling, Sharding & Ledger Design",
                "evidence_classification": "Insufficient coverage",
                "bars_level": None,
                "bars_anchor": "Unassessed",
                "behavioral_observation": "Not explored due to early exit.",
                "evidence_quotes": [],
                "strengths": [],
                "gaps_or_limitations": [],
            },
            {
                "competency_id": "distributed_consistency_and_transactions",
                "competency_name": "Distributed Consistency, Idempotency & Transactions",
                "evidence_classification": "Insufficient coverage",
                "bars_level": None,
                "bars_anchor": "Unassessed",
                "behavioral_observation": "Not explored due to early exit.",
                "evidence_quotes": [],
                "strengths": [],
                "gaps_or_limitations": [],
            },
            {
                "competency_id": "resilience_and_failure_recovery",
                "competency_name": "Resilience, Failover & Failure Recovery",
                "evidence_classification": "Insufficient coverage",
                "bars_level": None,
                "bars_anchor": "Unassessed",
                "behavioral_observation": "Not explored due to early exit.",
                "evidence_quotes": [],
                "strengths": [],
                "gaps_or_limitations": [],
            },
            {
                "competency_id": "tradeoff_analysis_and_retrospective",
                "competency_name": "Trade-Off Analysis & Retrospective Reasoning",
                "evidence_classification": "Insufficient coverage",
                "bars_level": None,
                "bars_anchor": "Unassessed",
                "behavioral_observation": "Not explored due to early exit.",
                "evidence_quotes": [],
                "strengths": [],
                "gaps_or_limitations": [],
            },
        ],
        "key_technical_strengths": ["Throughput target"],
        "key_technical_weaknesses": [],
        "unresolved_architectural_areas": ["All core system areas unaddressed due to early exit"],
        "communication_and_deliberation": "Brief candidate engagement.",
        "actionable_growth_plan": ["Complete full interview to demonstrate architecture"],
        "evaluation_limitations": ["Interview terminated early"],
        "evaluated_at": datetime.now(timezone.utc).isoformat(),
    }

    report = BarsEvaluator.sanitize_and_validate_report(raw_early_json, dummy_session)
    assert report.calibration_signal == "Inconclusive Due to Limited Coverage"
    assert report.coverage_summary.insufficient_coverage_count == 5
    # One two-word quote from a one-turn session is not enough evidence to call anything demonstrated.
    assert report.coverage_summary.demonstrated_count == 0
    assert report.coverage_summary.weak_count == 1
    assert report.coverage_summary.coverage_percentage < 50.0



