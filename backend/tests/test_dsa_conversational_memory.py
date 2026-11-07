"""Comprehensive Deterministic Regression Tests for DSA Conversational Memory and Timing.

Covers the 8 specific correctness scenarios:
1. Candidate provides optimal approach on turn 1.
2. Candidate starts with brute force and then improves it.
3. Candidate proposes an approach claiming it is optimal when it is not.
4. Candidate changes their proposed approach halfway through.
5. Candidate provides time complexity without space complexity or correctness reasoning.
6. Structured working memory summarisation preserves approach across turns.
7. Actor receives correct approach state and outstanding question state.
8. Candidate repeats an answer and the interviewer recognizes existing evidence.

Plus authoritative timing lifecycle tests for 15-minute interview deadline enforcement.
"""

import uuid
from datetime import datetime, timezone, timedelta
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.orchestrator_session import OrchestratorSession
from app.models.user import User
from app.orchestrator.actor import InterviewerActor
from app.orchestrator.dsa_intelligence import (
    extract_candidate_dsa_evidence,
    normalize_big_o,
)
from app.orchestrator.supervisor import SupervisorEngine, SupervisorDirective
from app.services.orchestrator_service import OrchestratorService


def create_mock_dsa_session(
    target_duration_seconds: int = 900,
    elapsed_seconds: int = 0,
    current_milestone: str = "problem_orientation_and_clarification",
    milestone_turn_counts: dict | None = None,
    working_memory: dict | None = None,
) -> OrchestratorSession:
    """Helper to instantiate deterministic in-memory session for test cases."""
    now = datetime.now(timezone.utc)
    created_at = now - timedelta(seconds=elapsed_seconds)
    deadline = created_at + timedelta(seconds=target_duration_seconds)

    mem = {
        "track": "DSA",
        "target_duration_seconds": target_duration_seconds,
        "scheduled_deadline": deadline.isoformat(),
        "session_started_at": created_at.isoformat(),
        "current_milestone": current_milestone,
        "milestone_history": [current_milestone],
        "milestone_turn_counts": milestone_turn_counts or {current_milestone: 0},
        "architectural_facts": [],
        "confirmed_vulnerabilities": [],
        "deliberation_seconds_spent": elapsed_seconds,
        "stagnation_turn_count": 0,
        "dsa_problem": {
            "id": "longest-substring",
            "title": "Longest Substring Without Repeating Characters",
            "optimal_time_complexity": "O(N)",
            "optimal_space_complexity": "O(1)",
            "revealed": False,
        },
        "structured_knowledge": {
            "approach_summary": {
                "initial_intuition": None,
                "brute_force": None,
                "optimal_approach": None,
                "alternative_approaches": [],
            },
            "complexities": {
                "brute_force_time": None,
                "brute_force_space": None,
                "optimal_time": None,
                "optimal_space": None,
            },
            "dsa_state": {},
        },
    }
    if working_memory:
        mem.update(working_memory)

    return OrchestratorSession(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        track="DSA",
        title="DSA & Problem Solving Assessment",
        status="in_progress",
        evaluation_status="idle",
        turn_index=0,
        fencing_token=0,
        working_memory=mem,
        transcript=[],
        created_at=created_at,
        updated_at=now,
    )


# ==============================================================================
# Scenario 1: Candidate provides optimal approach on turn 1
# ==============================================================================
def test_scenario_1_optimal_approach_on_turn_1():
    """Candidate articulates optimal two-pointer sliding window on turn 1.

    Supervisor MUST skip brute-force baseline and must not ask for brute force.
    """
    session = create_mock_dsa_session(current_milestone="problem_orientation_and_clarification")
    cand_text = (
        "For Longest Substring Without Repeating Characters, we can use a two-pointer "
        "sliding window with a hash map of character positions to achieve optimal O(N) time "
        "and O(min(N, Sigma)) auxiliary space."
    )

    directive = SupervisorEngine.evaluate_state(session, candidate_text=cand_text)

    # Directive must NOT be brute force!
    assert "brute" not in directive.current_milestone_id
    assert "brute" not in directive.suggested_fallback_probe.lower()
    assert "STRICT REGRESSION PROHIBITION" in directive.guidance
    assert directive.action in ("TRANSITION_MILESTONE", "PROBE_DEEPER")
    assert directive.current_milestone_id in ("algorithmic_optimization", "code_implementation_and_dryrun")


# ==============================================================================
# Scenario 2: Candidate starts with brute force and then improves it
# ==============================================================================
def test_scenario_2_brute_force_then_improved():
    """Candidate begins with brute-force baseline, then improves to optimal.

    Supervisor should guide through brute-force then transition to optimal without regressing.
    """
    session = create_mock_dsa_session(current_milestone="problem_orientation_and_clarification")

    # Turn 1: Brute force
    turn1_text = "The naive brute force approach checks all substrings in O(N^2) time with nested loops."
    mem1 = SupervisorEngine.update_working_memory_after_turn(
        session.working_memory,
        delta_metadata={"technical_claims": ["O(N^2) baseline"]},
        candidate_text=turn1_text,
    )
    session.working_memory = mem1
    session.working_memory["current_milestone"] = "brute_force_and_intuition"
    session.working_memory["milestone_turn_counts"]["brute_force_and_intuition"] = 1

    directive1 = SupervisorEngine.evaluate_state(session, candidate_text=turn1_text)
    assert directive1.current_milestone_id == "brute_force_and_intuition"

    # Turn 2: Optimization to optimal
    turn2_text = (
        "To optimize this, we can maintain a sliding window with left and right pointers. "
        "This brings the time complexity down to optimal O(N) and auxiliary space to O(1)."
    )
    directive2 = SupervisorEngine.evaluate_state(session, candidate_text=turn2_text)

    # Must advance to optimization / implementation, NEVER stay in brute force or ask for brute force
    assert "STRICT REGRESSION PROHIBITION" in directive2.guidance
    assert directive2.current_milestone_id in ("algorithmic_optimization", "code_implementation_and_dryrun")


# ==============================================================================
# Scenario 3: Candidate proposes an approach claiming it is optimal when it is not
# ==============================================================================
def test_scenario_3_flawed_optimality_claim():
    """Candidate claims an O(N^2) or O(N log N) solution is optimal for an O(N) problem.

    Supervisor must CHALLENGE_FLAW rather than accepting the flawed optimality claim.
    """
    session = create_mock_dsa_session()
    cand_text = (
        "We can solve this problem optimally in O(N^2) time by using nested loops to check every pair."
    )

    directive = SupervisorEngine.evaluate_state(session, candidate_text=cand_text)

    assert directive.action == "CHALLENGE_FLAW"
    assert "claimed optimality vs theoretical lower bound" in directive.target_focus
    assert "suboptimal" in directive.guidance.lower()


# ==============================================================================
# Scenario 4: Candidate changes their proposed approach halfway through
# ==============================================================================
def test_scenario_4_candidate_pivots_approach():
    """Candidate pivots from Dynamic Programming to Monotonic Stack.

    Supervisor must record the previous approach, acknowledge the pivot, and probe the new invariant.
    """
    session = create_mock_dsa_session()
    # Establish previous DP approach
    session.working_memory["structured_knowledge"]["dsa_state"] = {
        "proposed_approach": "2D Dynamic Programming table",
        "approach_category": "optimal",
        "identified_algorithms": ["dynamic_programming"],
    }

    pivot_text = (
        "Actually, 2D dynamic programming will take O(N^2) space which is too expensive. "
        "Instead, let me switch to a Monotonic Stack which achieves O(N) time and O(N) space."
    )

    directive = SupervisorEngine.evaluate_state(session, candidate_text=pivot_text)

    assert directive.action == "PROBE_DEEPER"
    assert "switched approach" in directive.target_focus
    assert "pivoted" in directive.guidance.lower()


# ==============================================================================
# Scenario 5: Candidate provides time complexity without space or correctness
# ==============================================================================
def test_scenario_5_time_without_space_or_correctness():
    """Candidate asserts O(N) time without explaining space complexity or correctness.

    Supervisor must probe space complexity and correctness reasoning without asking for brute force.
    """
    session = create_mock_dsa_session()
    cand_text = "I will use a two-pointer approach that runs in O(N) time."

    directive = SupervisorEngine.evaluate_state(session, candidate_text=cand_text)

    assert directive.action == "PROBE_DEEPER"
    assert "auxiliary space complexity and correctness invariant" in directive.target_focus
    assert "STRICT REGRESSION PROHIBITION" in directive.guidance
    assert "brute" not in directive.suggested_fallback_probe.lower()


# ==============================================================================
# Scenario 6: Working memory summarization preserves approach across turns
# ==============================================================================
def test_scenario_6_memory_summarization_preserves_approach():
    """Working memory must retain the established optimal approach across multiple turns."""
    mem = create_mock_dsa_session().working_memory

    # Turn 1: Optimal approach stated
    mem = SupervisorEngine.update_working_memory_after_turn(
        mem,
        delta_metadata={},
        candidate_text="We will use a sliding window in O(N) time and O(1) space.",
        assistant_response="Great, explain the pointer updates.",
    )

    dsa_state_t1 = mem["structured_knowledge"]["dsa_state"]
    assert dsa_state_t1["approach_category"] == "optimal"
    assert dsa_state_t1["time_complexity"] == "O(N)"
    assert mem["structured_knowledge"]["approach_summary"]["optimal_approach"] is not None

    # Turn 2: Unrelated candidate question on edge case
    mem = SupervisorEngine.update_working_memory_after_turn(
        mem,
        delta_metadata={},
        candidate_text="How should we handle empty string inputs?",
        assistant_response="An empty string should return 0.",
    )

    # Turn 3: Edge case discussion
    mem = SupervisorEngine.update_working_memory_after_turn(
        mem,
        delta_metadata={},
        candidate_text="And if all characters are identical, the length should be 1.",
        assistant_response="Correct, since only one distinct character exists.",
    )

    # Ensure approach was preserved without loss
    dsa_state_t3 = mem["structured_knowledge"]["dsa_state"]
    assert dsa_state_t3["approach_category"] == "optimal"
    assert dsa_state_t3["time_complexity"] == "O(N)"
    assert mem["structured_knowledge"]["approach_summary"]["optimal_approach"] is not None


# ==============================================================================
# Scenario 7: Actor receives correct approach state and outstanding question state
# ==============================================================================
def test_scenario_7_actor_receives_correct_state():
    """Actor system prompt must contain regression prohibition and approach metadata."""
    session = create_mock_dsa_session()
    session.working_memory["structured_knowledge"]["approach_summary"]["optimal_approach"] = (
        "Sliding window with hash map"
    )
    session.working_memory["structured_knowledge"]["complexities"]["optimal_time"] = "O(N)"
    session.working_memory["structured_knowledge"]["complexities"]["optimal_space"] = "O(1)"

    cand_text = "I'm ready to proceed."
    directive = SupervisorEngine.evaluate_state(session, candidate_text=cand_text)

    actor = InterviewerActor()
    prompt = actor.build_system_prompt(directive, session.working_memory)

    assert "REGRESSION PROHIBITION: DO NOT ask for the brute-force baseline" in prompt
    assert "Sliding window with hash map" in prompt
    assert "O(N)" in prompt


# ==============================================================================
# Scenario 8: Candidate repeats an answer and interviewer recognizes existing evidence
# ==============================================================================
def test_scenario_8_candidate_repetition_recognized():
    """Candidate indicates they already answered a question.

    Supervisor must issue ACKNOWLEDGE_AND_ADVANCE rather than repeating the probe.
    """
    session = create_mock_dsa_session()
    session.working_memory["structured_knowledge"]["dsa_state"] = {
        "proposed_approach": "Two-pointer sliding window",
        "approach_category": "optimal",
        "time_complexity": "O(N)",
    }

    cand_text = (
        "As I already explained earlier, the left pointer jumps past the duplicate character "
        "using the stored index in the hash map."
    )

    directive = SupervisorEngine.evaluate_state(session, candidate_text=cand_text)

    assert directive.action == "ACKNOWLEDGE_AND_ADVANCE"
    assert "existing evidence acknowledged" in directive.target_focus
    assert "reiterating" in directive.suggested_fallback_probe or "already" in directive.guidance.lower()


# ==============================================================================
# Timing Lifecycle Tests: 15-Minute Interview Deadline & No Premature Conclusion
# ==============================================================================
def test_timing_lifecycle_15m_interview_active_at_12m():
    """For a 15m interview, session must remain IN PROGRESS at minute 12 (720s elapsed).

    It must NOT transition to CONCLUDE simply because 12 minutes have passed.
    """
    # 15m interview (900s), 12m elapsed (720s) -> 180s remaining (3m remaining)
    session = create_mock_dsa_session(
        target_duration_seconds=900,
        elapsed_seconds=720,
        current_milestone="complexity_verification_and_testing",
    )

    directive = SupervisorEngine.evaluate_state(session)

    # Must NOT conclude time budget! 3 minutes remain.
    assert directive.action in ("PROBE_DEEPER", "TRANSITION_MILESTONE")
    assert directive.action != "CONCLUDE_TIME_BUDGET"
    assert directive.action != "CLOSING_WINDOW"  # 180s > 120s


def test_timing_lifecycle_15m_interview_closing_window():
    """At 13.5 minutes (810s elapsed, 90s remaining), session enters CLOSING_WINDOW.

    It must NOT mark the interview completed yet.
    """
    session = create_mock_dsa_session(
        target_duration_seconds=900,
        elapsed_seconds=810,
        current_milestone="complexity_verification_and_testing",
    )

    directive = SupervisorEngine.evaluate_state(session)

    assert directive.action == "CLOSING_WINDOW"
    assert "closing window" in directive.target_focus.lower()


def test_timing_lifecycle_15m_interview_hard_deadline_conclude():
    """At 15 minutes (900s elapsed, 0s remaining), hard deadline triggers CONCLUDE_TIME_BUDGET."""
    session = create_mock_dsa_session(
        target_duration_seconds=900,
        elapsed_seconds=900,
        current_milestone="complexity_verification_and_testing",
    )

    directive = SupervisorEngine.evaluate_state(session)

    assert directive.action == "CONCLUDE_TIME_BUDGET"
    assert directive.is_final_milestone is True


@pytest.mark.asyncio
async def test_session_creation_duration_persistence(db_session: AsyncSession):
    """Verifies that create_session persists target_duration_seconds and scheduled_deadline."""
    user = User(
        id=uuid.uuid4(),
        full_name="Timing Test User",
        email=f"timing_{uuid.uuid4().hex[:6]}@interviewiq.test",
        hashed_password="pw",
    )
    db_session.add(user)
    await db_session.commit()

    # Create 15-minute session
    session = await OrchestratorService.create_session(
        db_session,
        user_id=user.id,
        track="DSA",
        title="15-min DSA Calibration",
        target_duration_seconds=900,
    )

    mem = session.working_memory
    assert mem["target_duration_seconds"] == 900
    assert "scheduled_deadline" in mem

    dl = datetime.fromisoformat(mem["scheduled_deadline"])
    start = datetime.fromisoformat(mem["session_started_at"])
    diff_sec = int((dl - start).total_seconds())
    assert diff_sec == 900
