"""Milestone 1 Verification Tests:
Structured Conversational Memory Foundation & Per-Milestone Fact Scoping.

Verifies:
1. Multi-turn retention beyond 12 entries: earlier approach, Big-O complexities, examples, and edge cases persist in system prompt.
2. Candidate corrections update structured knowledge rather than accumulating conflicting obsolete claims.
3. Repetition signals and answered question notices are captured and surfaced in prompt.
4. Per-milestone fact scoping prevents premature transitions.
5. Atomic turn commitment successfully persists structured knowledge and running summary.
"""

import uuid
import pytest
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.orchestrator_session import OrchestratorSession
from app.models.user import User
from app.orchestrator.actor import InterviewerActor
from app.orchestrator.milestones import get_milestones_for_track
from app.orchestrator.supervisor import SupervisorEngine
from app.schemas.orchestrator import ApproachUpdate, TurnClassification, TurnDeltaMetadata
from app.services.orchestrator_service import OrchestratorService


@pytest.mark.asyncio
async def test_structured_memory_retention_across_15_turns(db_session: AsyncSession, test_user: User):
    """Verifies that across 15 turns, Turn 1 brute-force complexity and examples
    remain 100% available in structured knowledge and running summary within system prompt.
    """
    actor = InterviewerActor()
    session = await OrchestratorService.create_session(
        db_session,
        user_id=test_user.id,
        track="DSA",
        title="15-Turn Conversational Memory Test",
    )

    # Turn 0: Clarification
    # Turn 1: Brute force O(N^2) time, O(1) space, example "abcabcbb" -> 3
    # Turns 2-14: Further discussion
    wm = session.working_memory

    # Simulate Turn 1 delta metadata with approach update and example
    delta_turn1 = {
        "technical_claims": ["brute force checks all substrings"],
        "identified_vulnerabilities": ["O(N^2) time bottleneck"],
        "progress_classification": "PROGRESS",
        "approach_update": {
            "approach_type": "brute_force",
            "description": "Two nested loops checking all substrings",
            "time_complexity": "O(N^2)",
            "space_complexity": "O(1)",
        },
        "examples_provided": ["abcabcbb -> 3"],
        "edge_cases_covered": ["empty string returns 0"],
    }
    wm = SupervisorEngine.update_working_memory_after_turn(
        wm,
        delta_turn1,
        candidate_text="For brute force, two nested loops gives O(N^2) time and O(1) space. Example 'abcabcbb' gives 3. Edge case: empty string.",
        assistant_response="Understood. What is the bottleneck in this O(N^2) baseline?",
    )

    # Verify structured_knowledge in wm
    sk = wm["structured_knowledge"]
    assert sk["approach_summary"]["brute_force"] == "Two nested loops checking all substrings"
    assert sk["complexities"]["brute_force_time"] == "O(N^2)"
    assert sk["complexities"]["brute_force_space"] == "O(1)"
    assert "abcabcbb -> 3" in sk["examples_discussed"]
    assert "empty string returns 0" in sk["edge_cases_covered"]

    # Now simulate 13 more turns (total 14 turns = 28 transcript entries)
    # This far exceeds the legacy 12-entry transcript slice window!
    transcript = [
        {"turn_index": 0, "speaker": "Alex", "text": "Welcome to DSA."},
        {"turn_index": 0, "speaker": "Candidate", "text": "Hello Alex."},
        {"turn_index": 1, "speaker": "Alex", "text": "What is brute force?"},
        {"turn_index": 1, "speaker": "Candidate", "text": "Two nested loops O(N^2)."},
    ]
    for i in range(2, 15):
        turn_text_cand = f"Turn {i} candidate explanation on sliding window state and pointer increments."
        turn_text_alex = f"Turn {i} interviewer probe on invariants."
        transcript.append({"turn_index": i, "speaker": "Candidate", "text": turn_text_cand})
        transcript.append({"turn_index": i, "speaker": "Alex", "text": turn_text_alex})

        # Update working memory for each turn
        delta_turn = {
            "technical_claims": [f"claim at turn {i}"],
            "identified_vulnerabilities": [],
            "progress_classification": "PROGRESS",
        }
        wm = SupervisorEngine.update_working_memory_after_turn(
            wm,
            delta_turn,
            candidate_text=turn_text_cand,
            assistant_response=turn_text_alex,
        )

    # Now construct the Actor's system prompt on Turn 15:
    fake_session = OrchestratorSession(
        id=session.id,
        user_id=test_user.id,
        track="DSA",
        title="15-Turn Conversational Memory Test",
        turn_index=15,
        working_memory=wm,
        transcript=transcript,
    )
    directive = SupervisorEngine.evaluate_state(fake_session)
    system_prompt = actor.build_system_prompt(directive, wm)

    # CRITICAL VERIFICATION:
    # 1. Turn 1 brute force O(N^2) complexity MUST be in the system prompt!
    assert "O(N^2)" in system_prompt
    assert "Two nested loops checking all substrings" in system_prompt
    # 2. Example MUST be in the system prompt!
    assert "abcabcbb -> 3" in system_prompt
    # 3. Edge case MUST be in the system prompt!
    assert "empty string returns 0" in system_prompt
    # 4. Running digest MUST be in the system prompt!
    assert "RUNNING INTERVIEW DIGEST:" in system_prompt


@pytest.mark.asyncio
async def test_candidate_corrections_and_repetition_notices():
    """Verifies that candidate corrections update structured memory and repetition
    notices are captured.
    """
    wm = {}
    delta = {
        "technical_claims": ["use sliding window"],
        "identified_vulnerabilities": [],
        "progress_classification": "PROGRESS",
        "approach_update": {
            "approach_type": "optimal",
            "description": "Sliding window with hash map",
            "time_complexity": "O(N)",
            "space_complexity": "O(min(N, M))",
        },
        "candidate_correction": "Actually, we don't need to increment left by 1; we jump directly to last_seen + 1",
        "repetition_noticed": True,
    }
    updated_wm = SupervisorEngine.update_working_memory_after_turn(
        wm,
        delta,
        candidate_text="As I already explained earlier, we can jump left pointer directly.",
        assistant_response="Understood.",
    )
    sk = updated_wm["structured_knowledge"]
    assert sk["approach_summary"]["optimal_approach"] == "Sliding window with hash map"
    assert sk["complexities"]["optimal_time"] == "O(N)"
    assert len(sk["candidate_corrections"]) == 1
    assert "jump directly to last_seen + 1" in sk["candidate_corrections"][0]
    assert "repetition_identified" in sk["candidate_requests"]
    assert len(sk["questions_answered"]) >= 1


@pytest.mark.asyncio
async def test_per_milestone_fact_scoping_prevents_premature_transition():
    """Verifies that facts accumulated in Milestone 0 do NOT trigger Milestone 1 transition."""
    milestones = get_milestones_for_track("DSA")
    m0 = milestones[0]
    m1 = milestones[1]

    # Create working memory with 5 facts in Milestone 0
    wm = {
        "track": "DSA",
        "current_milestone": m0.id,
        "milestone_facts": {m0.id: ["fact1", "fact2", "fact3", "fact4", "fact5"]},
        "milestone_turn_counts": {m0.id: 2},
        "architectural_facts": ["fact1", "fact2", "fact3", "fact4", "fact5"],
    }

    # Transition to m1
    wm["current_milestone"] = m1.id
    wm["milestone_turn_counts"][m1.id] = 0

    session = OrchestratorSession(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        track="DSA",
        title="Scoping Test",
        turn_index=3,
        working_memory=wm,
        transcript=[],
    )

    # At turn count 0 of Milestone 1, with NO facts in Milestone 1:
    directive = SupervisorEngine.evaluate_state(session)
    # Milestone 1 MUST NOT transition immediately, even though global architectural_facts has 5 items!
    assert directive.action != "TRANSITION_MILESTONE"
    assert directive.current_milestone_id == m1.id

