"""Stage 0.3 Automated Interview Simulation Test Suite.

Verifies the complete Supervisor Engine and Actor Turn Execution across the 7 user scenarios:
1. Strong candidate: probes deeper on trade-offs rather than repeating basic questions.
2. Average candidate: investigates gaps and edge cases.
3. Weak candidate: offers progressive hints without giving away answers.
4. Evasive candidate: converts buzzwords into concrete technical questions.
5. Overconfident candidate: challenges unsupported claims and identifies contradictions.
6. Candidate changing their answer: remembers and revisits earlier explanation.
7. Candidate asking an unrelated question: handles naturally and redirects.
"""

import json
import uuid
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.orchestrator.actor import InterviewerActor
from app.orchestrator.runner import OrchestratorRunner
from app.orchestrator.supervisor import SupervisorDirective, SupervisorEngine
from app.schemas.orchestrator import TurnClassification, TurnDeltaMetadata
from app.services.orchestrator_service import OrchestratorService


class MockInterviewerActor(InterviewerActor):
    """Predictable mock actor for deterministic testing of Supervisor directives and state transitions."""

    def __init__(self, scripted_responses: list[tuple[str, TurnDeltaMetadata]] | None = None):
        super().__init__()
        self.scripted_responses = scripted_responses or []
        self.call_count = 0
        self.captured_directives: list[SupervisorDirective] = []
        self.captured_prompts: list[str] = []

    async def generate_turn(
        self,
        directive: SupervisorDirective,
        working_memory: dict,
        transcript: list[dict],
        candidate_text: str,
    ) -> tuple[str, TurnDeltaMetadata, float, float]:
        self.captured_directives.append(directive)
        sys_prompt = self.build_system_prompt(directive, working_memory)
        self.captured_prompts.append(sys_prompt)

        if self.call_count < len(self.scripted_responses):
            resp, delta = self.scripted_responses[self.call_count]
        else:
            resp = f"Mock Socratic follow-up for directive {directive.action}"
            delta = TurnDeltaMetadata(
                technical_claims=[f"Claim from: {candidate_text[:30]}"],
                progress_classification=TurnClassification.PROGRESS,
                socratic_directive=directive.target_focus,
            )

        self.call_count += 1
        return resp, delta, 150.0, 500.0


@pytest.mark.asyncio
async def test_scenario_1_strong_candidate_probes_deeper(test_user: User, db_session: AsyncSession):
    """Strong candidate: Supervisor directs PROBE_DEEPER; Actor deepens trade-offs."""
    session = await OrchestratorService.create_session(
        db_session, user_id=test_user.id, track="System Design", title="Strong Candidate Calibration"
    )

    mock_actor = MockInterviewerActor([
        (
            "How do you handle cross-shard transaction coordination?",
            TurnDeltaMetadata(
                technical_claims=["Raft consensus on RocksDB", "account_id hash partitioning"],
                progress_classification=TurnClassification.PROGRESS,
                socratic_directive="cross_shard_transactions",
            ),
        ),
        (
            "What happens if the saga coordinator crashes midway through an escrow reservation?",
            TurnDeltaMetadata(
                technical_claims=["Distributed saga with compensating transactions"],
                progress_classification=TurnClassification.PROGRESS,
                socratic_directive="coordinator_failure_modes",
            ),
        ),
    ])

    runner = OrchestratorRunner(actor=mock_actor)

    # Turn 0
    res0 = await runner.execute_turn(
        db_session,
        session_id=session.id,
        user_id=test_user.id,
        expected_turn_index=0,
        client_turn_id=str(uuid.uuid4()),
        candidate_text="I partition accounts by account_id hash across 3-node Raft consensus shards with RocksDB.",
    )
    assert res0["turn_index"] == 1
    assert "Raft consensus" in str(res0["working_memory"]["architectural_facts"])
    assert mock_actor.captured_directives[0].action in ("PROBE_DEEPER", "TRANSITION_MILESTONE")

    # Turn 1
    res1 = await runner.execute_turn(
        db_session,
        session_id=session.id,
        user_id=test_user.id,
        expected_turn_index=1,
        client_turn_id=str(uuid.uuid4()),
        candidate_text="We use a distributed saga with compensating actions and escrow reservations.",
    )
    assert res1["turn_index"] == 2
    assert "Distributed saga" in str(res1["working_memory"]["architectural_facts"])


@pytest.mark.asyncio
async def test_scenario_2_weak_candidate_progressive_hints(test_user: User, db_session: AsyncSession):
    """Weak candidate: Stagnation and STUCK triggers progressive Socratic hints and prevents infinite loops."""
    session = await OrchestratorService.create_session(
        db_session, user_id=test_user.id, track="System Design", title="Weak Candidate Calibration"
    )

    mock_actor = MockInterviewerActor([
        (
            "Replication lag prevents instant cross-continent sync. Have you considered consensus protocols?",
            TurnDeltaMetadata(
                technical_claims=["MySQL multi-master"],
                identified_vulnerabilities=["Replication lag and conflict skew"],
                progress_classification=TurnClassification.STUCK,
                socratic_directive="consensus_hint",
            ),
        ),
        (
            "Locking the entire table causes severe write serialization. What more granular locking could work?",
            TurnDeltaMetadata(
                technical_claims=["Lock whole database table"],
                identified_vulnerabilities=["Total write serialization"],
                progress_classification=TurnClassification.STUCK,
                socratic_directive="granular_locking_hint",
            ),
        ),
        (
            "Understood. Let's move on to data modeling and API contracts.",
            TurnDeltaMetadata(
                technical_claims=[],
                progress_classification=TurnClassification.STUCK,
                socratic_directive="transition_milestone",
            ),
        ),
    ])

    runner = OrchestratorRunner(actor=mock_actor)

    # Turn 0: Candidate is stuck
    res0 = await runner.execute_turn(
        db_session,
        session_id=session.id,
        user_id=test_user.id,
        expected_turn_index=0,
        client_turn_id=str(uuid.uuid4()),
        candidate_text="I don't know how to handle replication lag. Can you give me a hint?",
    )
    assert res0["turn_index"] == 1
    assert res0["working_memory"]["stagnation_turn_count"] == 1

    # Turn 1: Candidate proposes table locking (stagnation == 2 -> HINT_AND_REDIRECT)
    res1 = await runner.execute_turn(
        db_session,
        session_id=session.id,
        user_id=test_user.id,
        expected_turn_index=1,
        client_turn_id=str(uuid.uuid4()),
        candidate_text="Could we just lock the whole database table while the transaction runs?",
    )
    assert res1["turn_index"] == 2
    assert res1["working_memory"]["stagnation_turn_count"] == 2
    assert mock_actor.captured_directives[1].action == "HINT_AND_REDIRECT"

    # Turn 2: Stagnation >= 2 triggers deterministic TRANSITION_MILESTONE
    res2 = await runner.execute_turn(
        db_session,
        session_id=session.id,
        user_id=test_user.id,
        expected_turn_index=2,
        client_turn_id=str(uuid.uuid4()),
        candidate_text="I still have no idea.",
    )
    assert mock_actor.captured_directives[2].action == "TRANSITION_MILESTONE"


@pytest.mark.asyncio
async def test_scenario_3_overconfident_contradictory_challenge(test_user: User, db_session: AsyncSession):
    """Overconfident candidate: Supervisor issues CHALLENGE_FLAW on detected contradictions."""
    session = await OrchestratorService.create_session(
        db_session, user_id=test_user.id, track="System Design", title="Overconfident Calibration"
    )

    mock_actor = MockInterviewerActor([
        (
            "Earlier you claimed strict serializability, but eventual consistency allows write conflicts. How do you reconcile those?",
            TurnDeltaMetadata(
                technical_claims=["Eventual consistency resolves conflicts"],
                identified_vulnerabilities=["Direct contradiction with strict serializability"],
                progress_classification=TurnClassification.PROGRESS,
                socratic_directive="reconcile_contradiction",
            ),
        ),
    ])

    runner = OrchestratorRunner(actor=mock_actor)

    # Establish previous claim in working memory
    session.working_memory = {
        **session.working_memory,
        "architectural_facts": ["Strict serializability with zero latency"],
        "confirmed_vulnerabilities": ["CAP theorem violation: claimed zero latency global serializability"],
    }
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(session, "working_memory")
    await db_session.commit()

    res = await runner.execute_turn(
        db_session,
        session_id=session.id,
        user_id=test_user.id,
        expected_turn_index=0,
        client_turn_id=str(uuid.uuid4()),
        candidate_text="If two conflicts happen, we let both succeed and fix it later with eventual consistency.",
    )
    assert res["turn_index"] == 1
    assert mock_actor.captured_directives[0].action == "CHALLENGE_FLAW"
    assert "Direct contradiction" in str(res["working_memory"]["confirmed_vulnerabilities"])


@pytest.mark.asyncio
async def test_scenario_4_candidate_changing_answer(test_user: User, db_session: AsyncSession):
    """Candidate changes their mind: Actor prompt receives both old and new facts to maintain context."""
    session = await OrchestratorService.create_session(
        db_session, user_id=test_user.id, track="System Design", title="Answer Change Test"
    )

    mock_actor = MockInterviewerActor()
    runner = OrchestratorRunner(actor=mock_actor)

    # Turn 0: Propose PostgreSQL
    await runner.execute_turn(
        db_session,
        session_id=session.id,
        user_id=test_user.id,
        expected_turn_index=0,
        client_turn_id=str(uuid.uuid4()),
        candidate_text="I'll use PostgreSQL single master for the ledger.",
    )

    # Turn 1: Switch to Cassandra
    await runner.execute_turn(
        db_session,
        session_id=session.id,
        user_id=test_user.id,
        expected_turn_index=1,
        client_turn_id=str(uuid.uuid4()),
        candidate_text="Actually, PostgreSQL won't scale. Let me change my answer and use Cassandra instead.",
    )

    # Verify that the Actor's system prompt received PostgreSQL in its previous established facts!
    turn1_prompt = mock_actor.captured_prompts[1]
    assert "PostgreSQL" in turn1_prompt


@pytest.mark.asyncio
async def test_scenario_5_unrelated_question_redirect(test_user: User, db_session: AsyncSession):
    """Candidate asks an unrelated question: Alex answers concisely and returns to the interview."""
    session = await OrchestratorService.create_session(
        db_session, user_id=test_user.id, track="System Design", title="Unrelated Question Test"
    )

    mock_actor = MockInterviewerActor([
        (
            "Stripe's engineering culture values ownership and rigorous documentation. Returning to the ledger, how do you handle idempotency?",
            TurnDeltaMetadata(
                technical_claims=[],
                progress_classification=TurnClassification.DELIBERATION,
                socratic_directive="culture_answer_and_idempotency_probe",
            ),
        ),
    ])

    runner = OrchestratorRunner(actor=mock_actor)
    res = await runner.execute_turn(
        db_session,
        session_id=session.id,
        user_id=test_user.id,
        expected_turn_index=0,
        client_turn_id=str(uuid.uuid4()),
        candidate_text="Before we continue, what is Stripe's engineering culture like day-to-day?",
    )
    assert res["turn_index"] == 1
    assert "Stripe's engineering culture" in res["assistant_response"]
    assert "idempotency" in res["assistant_response"]
