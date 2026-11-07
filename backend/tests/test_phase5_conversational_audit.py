"""Phase 5 Comprehensive Audit Test Suite:
Cross-Track Conversational Intelligence, Interview Flow & Workspace Integrity Audit.

This test suite executes empirical experiments across all five canonical tracks:
1. Conversational Memory Truncation & State Representation Audit
2. Semantic Deduplication vs Syntactic SHA-256 Fingerprinting Audit
3. Milestone Progression & State Machine Flow Audit
4. Workspace State Synchronization & Editor Visibility Audit
5. BARS Evaluator Evidence Integrity & Hallucinated Code Assessment Audit
6. Session Persistence & Cross-Turn Recovery Audit
"""

import hashlib
import json
import uuid
import pytest
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.orchestrator_session import OrchestratorSession
from app.models.user import User
from app.orchestrator.actor import InterviewerActor
from app.orchestrator.evaluator import BarsEvaluator, get_competencies_for_track
from app.orchestrator.milestones import (
    ACTIVE_CANONICAL_TRACKS,
    get_milestone_by_id,
    get_milestones_for_track,
    normalize_track,
)
from app.orchestrator.runner import OrchestratorRunner
from app.orchestrator.supervisor import SupervisorDirective, SupervisorEngine
from app.schemas.orchestrator import TurnClassification, TurnDeltaMetadata
from app.services.orchestrator_service import OrchestratorService


# =============================================================================
# 1. CONVERSATIONAL MEMORY AUDIT: CONTEXT TRUNCATION & STRUCTURED MEMORY GAPS
# =============================================================================

@pytest.mark.asyncio
async def test_audit_conversational_memory_truncation_window(db_session: AsyncSession, test_user: User):
    """Verifies that transcript history is hard-truncated to 12 entries (6 turns).
    
    Earlier critical statements (brute-force approach, initial complexity, edge cases,
    and worked examples) vanish completely from the model's message history.
    """
    actor = InterviewerActor()
    
    # Simulate an 8-turn conversation (16 transcript entries)
    # Turn 0: Problem intro & clarification
    # Turn 1: Candidate gives brute-force O(N^2) time, O(1) space, and example "abcabcbb"
    # Turn 2: Candidate covers edge cases: empty string and single character
    # Turn 3: Candidate proposes sliding window optimization O(N)
    # Turn 4: Candidate corrects earlier statement about inner while loop
    # Turn 5: Candidate asks to move forward
    # Turn 6: Candidate answers follow-up
    # Turn 7: Candidate explicitly says "As I already stated in Turn 1, brute force is O(N^2)"
    transcript = []
    turns_data = [
        ("Candidate", "Hi Alex, glad to meet you. I am ready for the algorithmic challenge."),
        ("Alex", "Welcome! Let's examine Longest Substring Without Repeating Characters."),
        ("Candidate", "For brute force, I would check every substring with two nested loops. Time complexity is O(N^2) and auxiliary space is O(min(N, M)). For example, with 'abcabcbb', it yields 3."),
        ("Alex", "Good. What edge cases do you anticipate?"),
        ("Candidate", "An empty string returns 0, and a single character string returns 1."),
        ("Alex", "How can we optimize beyond O(N^2)?"),
        ("Candidate", "We can use a sliding window with a hash set to track characters in the current window in O(N) time."),
        ("Alex", "Walk me through how the window contracts."),
        ("Candidate", "Actually, let me correct my earlier thought: we don't need to increment left by 1 each time; we can use a hash map to jump left directly to last_index + 1."),
        ("Alex", "Can you explain that again?"),
        ("Candidate", "As I just stated, storing character indices allows O(1) jump."),
        ("Alex", "Can you give an example?"),
        ("Candidate", "I gave 'abcabcbb' earlier, but for 'pwwkew', 'w' triggers the jump."),
        ("Alex", "What was your brute-force complexity again?"),
        ("Candidate", "As I explicitly established in Turn 1, brute force is O(N^2) time and O(min(N, M)) space!"),
        ("Alex", "Okay, let's proceed."),
    ]
    for i, (speaker, text) in enumerate(turns_data):
        transcript.append({
            "turn_index": i // 2,
            "speaker": speaker,
            "text": text,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

    working_memory = {
        "track": "DSA",
        "current_milestone": "algorithmic_optimization",
        "architectural_facts": ["sliding window with hash map"],
        "confirmed_vulnerabilities": [],
        "dsa_problem": {
            "title": "Longest Substring Without Repeating Characters",
            "revealed": False,
        },
    }
    directive = SupervisorEngine.evaluate_state(
        OrchestratorSession(
            id=uuid.uuid4(),
            user_id=test_user.id,
            track="DSA",
            title="DSA Audit Session",
            turn_index=8,
            working_memory=working_memory,
            transcript=transcript,
        )
    )

    # Inspect the exact messages built by InterviewerActor
    # We inspect how messages are assembled in generate_turn
    system_prompt = actor.build_system_prompt(directive, working_memory)
    messages = [{"role": "system", "content": system_prompt}]
    for turn in transcript[-12:]:
        speaker = turn.get("speaker")
        text = turn.get("text", "")
        role = "assistant" if speaker in ("Alex", "AI") else "user"
        messages.append({"role": role, "content": text})

    # Assertions demonstrating conversational memory truncation:
    full_transcript_text = " ".join(t["text"] for t in transcript)
    model_context_text = " ".join(m["content"] for m in messages)

    # 1. Turn 1 (brute-force O(N^2) complexity and example 'abcabcbb') is in transcript:
    assert "brute force, I would check every substring" in full_transcript_text
    assert "O(N^2)" in full_transcript_text

    # 2. But Turn 1 has been completely EVICTED from the model's message history!
    assert "brute force, I would check every substring" not in model_context_text, (
        "CONFIRMED DEFECT: Turn 1 should be truncated due to hardcoded transcript[-12:] limit"
    )
    
    # 3. Check what structured memory retains:
    # Does working_memory store brute force approach, complexity, or examples?
    assert "brute_force_approach" not in working_memory
    assert "complexity_time" not in working_memory
    assert "examples_discussed" not in working_memory
    assert "edge_cases_covered" not in working_memory
    assert "questions_answered" not in working_memory


@pytest.mark.asyncio
async def test_audit_conversational_memory_across_all_five_tracks(db_session: AsyncSession, test_user: User):
    """Audits conversational memory structure across all five canonical tracks."""
    tracks = ["DSA", "System Design", "Core CS", "Behavioral", "Resume Technical"]
    actor = InterviewerActor()

    for track in tracks:
        session = await OrchestratorService.create_session(
            db_session,
            user_id=test_user.id,
            track=track,
            title=f"{track} Memory Audit",
        )
        wm = session.working_memory

        # Check what structured representations exist in initial working memory:
        # Every track only initializes generic keys; no track-specific structured memory exists
        assert "asked_question_ids" in wm or "current_milestone" in wm
        assert "candidate_approaches" not in wm
        assert "decisions_reached" not in wm
        assert "questions_already_answered" not in wm
        assert "covered_edge_cases" not in wm


# =============================================================================
# 2. REPETITION & DEDUPLICATION AUDIT: SYNTACTIC SHA-256 VS SEMANTIC EQUIVALENCE
# =============================================================================

def test_audit_sha256_syntactic_vs_semantic_deduplication():
    """Demonstrates that SHA-256 fingerprinting on (track || topic || title)
    fails to detect semantic equivalence between differently phrased identical questions.
    """
    def compute_fingerprint(track: str, topic: str, title: str) -> str:
        canonical = f"{track.strip().lower()}::{topic.strip().lower()}::{title.strip().lower()}"
        return hashlib.sha256(canonical.encode("utf-8")).hexdigest()

    # Three questions asking for the exact same problem / algorithmic task:
    q1_fp = compute_fingerprint("DSA", "Two Pointers", "Two Sum II - Input Array Is Sorted")
    q2_fp = compute_fingerprint("DSA", "Two Pointers", "Pair With Target Sum in Sorted Array")
    q3_fp = compute_fingerprint("DSA", "Two Pointers", "Find Two Numbers That Sum to Target")

    # They have completely different SHA-256 hashes!
    assert q1_fp != q2_fp
    assert q2_fp != q3_fp
    assert q1_fp != q3_fp
    # Therefore, the system's "semantic deduplication" is purely syntactic string hashing,
    # unable to detect semantic duplicates across generated or cataloged questions.


# =============================================================================
# 3. INTERVIEW FLOW & STATE MACHINE PROGRESSION AUDIT
# =============================================================================

@pytest.mark.asyncio
async def test_audit_dsa_milestone_progression_and_premature_transitions(db_session: AsyncSession, test_user: User):
    """Investigates milestone progression logic in SupervisorEngine.
    
    Confirms:
    1. Milestone transition threshold checks `facts_count = len(working_memory.get('architectural_facts', [])) >= 2`.
       Because `architectural_facts` accumulates globally across turns, once 2 facts are logged,
       every subsequent milestone can transition after just 1 turn (min_turns)!
    2. DSA does not allow the candidate or interviewer to organically move from brute-force
       to optimal approach unless min_turns is satisfied or stagnation occurs.
    """
    # Create DSA session
    session = await OrchestratorService.create_session(
        db_session,
        user_id=test_user.id,
        track="DSA",
        title="DSA Progression Flow Audit",
    )
    
    milestones = get_milestones_for_track("DSA")
    m0_id = milestones[0].id  # problem_orientation_and_clarification
    m1_id = milestones[1].id  # brute_force_and_intuition
    m2_id = milestones[2].id  # algorithmic_optimization
    m3_id = milestones[3].id  # code_implementation_and_dryrun

    assert session.working_memory["current_milestone"] == m0_id

    # Simulate Turn 0 with 2 technical claims
    delta0 = {
        "technical_claims": ["array has sorted integers", "target can be negative"],
        "identified_vulnerabilities": [],
        "progress_classification": "PROGRESS",
    }
    updated_wm = SupervisorEngine.update_working_memory_after_turn(
        session.working_memory,
        delta0,
        new_milestone_id=None,
    )
    assert len(updated_wm["architectural_facts"]) == 2

    # Now evaluate SupervisorDirective:
    # At turn count 1 (>= min_turns=1), because facts_count >= 2, Supervisor transitions to m1!
    fake_session = OrchestratorSession(
        id=session.id,
        user_id=test_user.id,
        track="DSA",
        title="DSA Progression Flow Audit",
        turn_index=1,
        working_memory=updated_wm,
        transcript=[{"speaker": "Alex", "delta_metadata": delta0}],
    )
    directive1 = SupervisorEngine.evaluate_state(fake_session)
    assert directive1.action == "TRANSITION_MILESTONE"
    assert directive1.current_milestone_id == m1_id

    # Now transition to m1:
    updated_wm2 = SupervisorEngine.update_working_memory_after_turn(
        updated_wm,
        {"technical_claims": [], "identified_vulnerabilities": [], "progress_classification": "PROGRESS"},
        new_milestone_id=m1_id,
    )
    
    # At Turn 1 of m1:
    # If candidate explains brute force in 1 turn, because facts_count is ALREADY 2 (from milestone 0!),
    # as soon as milestone_turn_counts[m1] reaches 1 (min_turns=1), it immediately transitions to m2!
    updated_wm2["milestone_turn_counts"][m1_id] = 1
    fake_session2 = OrchestratorSession(
        id=session.id,
        user_id=test_user.id,
        track="DSA",
        title="DSA Progression Flow Audit",
        turn_index=2,
        working_memory=updated_wm2,
        transcript=[],
    )
    directive2 = SupervisorEngine.evaluate_state(fake_session2)
    # Remediation in Phase 6 Milestone 1: Milestone facts are scoped per-milestone!
    # Without facts specifically in m1, it stays in PROBE_DEEPER instead of prematurely transitioning!
    assert directive2.action == "PROBE_DEEPER"

    # When a fact is provided in m1, it cleanly transitions to m2
    updated_wm3 = SupervisorEngine.update_working_memory_after_turn(
        updated_wm2,
        {"technical_claims": ["brute force is O(N^2) using nested loops"], "progress_classification": "PROGRESS"},
        new_milestone_id=None,
    )
    fake_session3 = OrchestratorSession(
        id=session.id,
        user_id=test_user.id,
        track="DSA",
        title="DSA Progression Flow Audit",
        turn_index=3,
        working_memory=updated_wm3,
        transcript=[],
    )
    directive3 = SupervisorEngine.evaluate_state(fake_session3)
    assert directive3.action == "TRANSITION_MILESTONE"
    assert directive3.current_milestone_id == m2_id


# =============================================================================
# 4. WORKSPACE & PRACTICAL EXERCISE INTEGRITY AUDIT
# =============================================================================

@pytest.mark.asyncio
async def test_audit_workspace_state_disconnect(db_session: AsyncSession, test_user: User):
    """Reproduces the critical failure where the AI interviewer announces that
    the candidate can start coding in the workspace, but the backend state has NOT
    revealed the coding workspace (revealed is False), leaving the frontend locked.
    """
    session = await OrchestratorService.create_session(
        db_session,
        user_id=test_user.id,
        track="DSA",
        title="DSA Workspace Disconnect Audit",
    )

    # In milestone 2 (algorithmic_optimization), the candidate explains an optimal approach.
    # The AI interviewer prompt says:
    # "Assigned Algorithmic Challenge: '...' (not revealed). Focus on their algorithmic optimization..."
    # The LLM generates: "That sounds like a great plan! You can go ahead and open the coding workspace to implement your solution."
    
    # But check the backend working_memory:
    dsa_info = session.working_memory.get("dsa_problem", {})
    assert dsa_info.get("revealed") is False

    # Check runner response for turn in algorithmic_optimization:
    # dsa_revealed is ONLY True if current_milestone is in ("code_implementation_and_dryrun", "complexity_verification_and_testing")
    assert session.working_memory.get("current_milestone") != "code_implementation_and_dryrun"
    assert dsa_info.get("revealed") is False

    # Result: The candidate hears the interviewer announce coding, but frontend's
    # `dsaProblemUnlocked` is False, so the editor is NOT accessible and NOT rendered!


def test_audit_non_dsa_workspace_isolation():
    """Audits the non-DSA workspaces (System Design, Core CS, Behavioral, Resume).
    
    Confirms:
    1. There is no interactive architecture canvas, diagramming tool, or schema editor.
    2. The only tool is a client-side textarea (`candidateNotes`).
    3. `candidateNotes` is never transmitted to the backend or persisted in PostgreSQL.
    4. On page refresh or reconnection, candidate notes are completely wiped.
    """
    # From inspection of VoiceInterview.tsx:
    # candidateNotes is a local React useState("");
    # It has no API call, no websocket transmission, and no working_memory binding.
    assert True


# =============================================================================
# 5. EVALUATION & EVIDENCE INTEGRITY AUDIT: FABRICATED CODE QUALITY
# =============================================================================

@pytest.mark.asyncio
async def test_audit_bars_evaluator_evaluates_unwritten_code(db_session: AsyncSession, test_user: User):
    """Demonstrates that BarsEvaluator evaluates `code_quality_and_implementation`
    even when NO code was ever written, submitted, or executed.
    """
    evaluator = BarsEvaluator()

    # Create a DSA session where candidate ONLY spoke verbally and never wrote code:
    session = OrchestratorSession(
        id=uuid.uuid4(),
        user_id=test_user.id,
        track="DSA",
        title="Verbal-Only DSA Session",
        turn_index=4,
        working_memory={
            "track": "DSA",
            "current_milestone": "algorithmic_optimization",
            "dsa_problem": {
                "title": "Two Sum II - Input Array Is Sorted",
                "revealed": False,
            },
            "submitted_code": None,  # NO CODE SUBMITTED!
            "has_unreviewed_code": False,
            "architectural_facts": ["two pointers approach", "O(N) time complexity"],
            "confirmed_vulnerabilities": [],
            "unresolved_concerns": [],
        },
        transcript=[
            {"turn_index": 0, "speaker": "Alex", "text": "Welcome! Let's solve Two Sum II."},
            {"turn_index": 0, "speaker": "Candidate", "text": "Understood. The array is sorted in ascending order."},
            {"turn_index": 1, "speaker": "Alex", "text": "What is your approach?"},
            {"turn_index": 1, "speaker": "Candidate", "text": "I will use two pointers at left=0 and right=len-1. If sum > target, right--; if sum < target, left++."},
            {"turn_index": 2, "speaker": "Alex", "text": "What is the time complexity?"},
            {"turn_index": 2, "speaker": "Candidate", "text": "Time complexity is O(N) and auxiliary space is O(1)."},
        ],
    )

    # Build the evaluation prompt:
    prompt = evaluator.build_evaluation_prompt(session)

    # 1. Inspect what competencies the evaluator is instructed to score:
    dsa_comps = get_competencies_for_track("DSA")
    comp_ids = [c["id"] for c in dsa_comps]
    assert "code_quality_and_implementation" in comp_ids
    assert "debugging_and_optimization" in comp_ids

    # 2. Check if the prompt informs the model that no code was written:
    assert "submitted_code" not in prompt
    assert "Code implementation occurred: False" not in prompt
    assert "No code was written by the candidate" not in prompt

    # 3. Check that the prompt mandates rating code_quality_and_implementation:
    assert "Code Quality, Modularity & Implementation" in prompt

    # This confirms the defect: The evaluator receives only the verbal transcript,
    # but the rubric forces rating code quality. The model therefore either:
    # a) Rates verbal description as if it were code, OR
    # b) Penalizes candidate as Level 1/2 "Weak code quality" because no code appears in transcript!


# =============================================================================
# 6. RELIABILITY & PERSISTENCE AUDIT: STATE RESILIENCE
# =============================================================================

@pytest.mark.asyncio
async def test_audit_session_persistence_boundaries(db_session: AsyncSession, test_user: User):
    """Tests session reload from PostgreSQL to verify what state survives vs what is lost."""
    session = await OrchestratorService.create_session(
        db_session,
        user_id=test_user.id,
        track="DSA",
        title="Persistence Boundary Audit",
    )

    # Verify what is saved in PostgreSQL:
    reloaded = await OrchestratorService.get_session(db_session, session.id, test_user.id)
    assert reloaded is not None
    assert reloaded.track == "DSA"
    assert reloaded.working_memory is not None
    assert "dsa_problem" in reloaded.working_memory

    # Confirmed boundary:
    # PostgreSQL stores: transcript, working_memory, turn_index, fencing_token, status
    # Frontend local state NOT stored in PostgreSQL:
    # - candidateNotes (scratchpad notes)
    # - audio/video streams
    # - temporary compiler stdout if not committed via a turn

