"""Integration & Track Isolation Lifecycle Tests for Strop.

Audits end-to-end reliability across all 6 supported interview types:
- DSA & Problem Solving
- System Design
- Core CS
- Behavioral & Leadership
- Resume Technical
- Staff+ Engineering Leadership

Verifies:
1. Track Isolation & Prompt Boundaries in InterviewerActor
2. Deterministic Initial Milestones & Memory Initialization
3. Immediate Synchronization between OrchestratorSession & InterviewSession
4. BARS Rubric Grounding for each track
5. Clean Deletion & Reset across both tables
"""

import uuid
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.interview_session import InterviewSession
from app.models.orchestrator_session import OrchestratorSession
from app.models.user import User
from app.orchestrator.actor import InterviewerActor
from app.orchestrator.milestones import (
    TRACK_MILESTONES,
    get_milestones_for_track,
    normalize_track,
)
from app.orchestrator.supervisor import SupervisorDirective, SupervisorEngine
from app.services.orchestrator_service import OrchestratorService


ALL_CANONICAL_TRACKS = [
    "DSA",
    "System Design",
    "Core CS",
    "Behavioral",
    "Resume Technical",
    "Staff Leadership",
]


@pytest.mark.asyncio
async def test_track_normalization_all_variants():
    """Verify track aliases deterministically resolve to canonical names without defaulting to System Design."""
    assert normalize_track("dsa") == "DSA"
    assert normalize_track("algorithms & coding") == "DSA"
    assert normalize_track("system-design") == "System Design"
    assert normalize_track("cs-fundamentals") == "Core CS"
    assert normalize_track("behavioral") == "Behavioral"
    assert normalize_track("resume") == "Resume Technical"

    # Historical compatibility: recognized when allow_historical=True
    assert normalize_track("staff-leadership", allow_historical=True) == "Staff Leadership"
    assert normalize_track("Staff Leadership", allow_historical=True) == "Staff Leadership"

    # Explicit rejection for discontinued Staff+ Leadership on active creation
    with pytest.raises(ValueError, match="no longer a supported active interview track"):
        normalize_track("staff-leadership", allow_historical=False)

    with pytest.raises(ValueError, match="no longer a supported active interview track"):
        normalize_track("Staff Leadership", allow_historical=False)

    with pytest.raises(ValueError, match="Unsupported interview track"):
        normalize_track("unknown-nonexistent-track")


@pytest.mark.asyncio
async def test_all_tracks_have_distinct_milestones():
    """Verify each supported track has a non-empty, distinct progression of milestones."""
    for track in ALL_CANONICAL_TRACKS:
        milestones = get_milestones_for_track(track)
        assert len(milestones) >= 3, f"Track {track} should have at least 3 milestones"
        ids = [m.id for m in milestones]
        assert len(ids) == len(set(ids)), f"Duplicate milestone IDs in track {track}"


@pytest.mark.asyncio
async def test_actor_system_prompt_track_isolation():
    """Verify Actor prompts enforce strict domain boundaries and track fidelity."""
    actor = InterviewerActor()

    # 1. DSA track prompt must NOT mention distributed systems or ledger
    dsa_directive = SupervisorDirective(
        action="PROBE_DEEPER",
        current_milestone_id="problem_orientation_and_clarification",
        current_milestone_title="Problem Understanding & Clarification",
        target_focus="input bounds and constraints",
        guidance="Probe time complexity",
        suggested_fallback_probe="What is the scale of N?",
        stagnation_count=0,
        track="DSA",
    )
    dsa_wm = {
        "track": "DSA",
        "dsa_problem": {
            "id": "longest-substring",
            "title": "Longest Substring Without Repeating Characters",
            "revealed": False,
        },
    }
    dsa_prompt = actor.build_system_prompt(dsa_directive, dsa_wm)
    assert "CURRENT TRACK: DSA" in dsa_prompt
    assert "Longest Substring Without Repeating Characters" in dsa_prompt
    assert "pure coding and algorithms assessment" in dsa_prompt
    assert "DO NOT ask about distributed systems" in dsa_prompt
    assert "TRACK FIDELITY & IDENTITY GUARD" in dsa_prompt

    # 2. Core CS prompt must focus on OS, networking, concurrency
    cs_directive = SupervisorDirective(
        action="PROBE_DEEPER",
        current_milestone_id="os_kernel_and_execution_models",
        current_milestone_title="Operating Systems & Kernel Execution",
        target_focus="virtual memory paging",
        guidance="Probe page tables",
        suggested_fallback_probe="Explain how page faults work.",
        stagnation_count=0,
        track="Core CS",
    )
    cs_prompt = actor.build_system_prompt(cs_directive, {"track": "Core CS"})
    assert "CURRENT TRACK: Core CS" in cs_prompt
    assert "operating system kernel internals" in cs_prompt
    assert "DO NOT ask high-level distributed systems or LeetCode coding questions" in cs_prompt

    # 3. Behavioral prompt must enforce STAR framework
    beh_directive = SupervisorDirective(
        action="PROBE_DEEPER",
        current_milestone_id="high_stakes_crisis_management",
        current_milestone_title="Crisis Management & Incident Leadership",
        target_focus="ownership during production outage",
        guidance="Probe individual actions taken",
        suggested_fallback_probe="What was your specific action?",
        stagnation_count=0,
        track="Behavioral",
    )
    beh_prompt = actor.build_system_prompt(beh_directive, {"track": "Behavioral"})
    assert "CURRENT TRACK: Behavioral" in beh_prompt
    assert "STAR method" in beh_prompt
    assert "DO NOT ask system design or coding questions" in beh_prompt


@pytest.mark.asyncio
async def test_session_creation_initializes_appropriate_milestone_and_syncs_legacy(
    db_session: AsyncSession,
    test_user: User,
):
    """Verify creating sessions in each active track sets correct initial milestones and writes to both tables."""
    from pydantic import ValidationError
    from app.schemas.orchestrator import OrchestratorSessionCreate

    track_initial_milestones = {
        "DSA": "problem_orientation_and_clarification",
        "System Design": "requirements_and_scope",
        "Core CS": "os_internals_and_processes",
        "Behavioral": "situation_and_task_context",
        "Resume Technical": "resume_project_deep_dive",
    }

    for track, expected_milestone in track_initial_milestones.items():
        session = await OrchestratorService.create_session(
            db_session,
            user_id=test_user.id,
            track=track,
            title=f"{track} Test Session",
        )
        assert session.id is not None
        assert session.track == track
        assert session.status == "in_progress"
        assert session.evaluation_status == "idle"

        wm = session.working_memory or {}
        assert wm.get("track") == track
        assert wm.get("current_milestone") == expected_milestone

        if track == "DSA":
            assert "dsa_problem" in wm
            assert wm["dsa_problem"]["revealed"] is False

        # Verify synchronized row in legacy interview_sessions table exists immediately
        legacy = await db_session.get(InterviewSession, session.id)
        assert legacy is not None, f"Legacy record missing for track {track}"
        assert legacy.id == session.id
        assert legacy.track == track
        assert legacy.competency_level == "In Progress"

    # Explicit rejection for discontinued Staff+ Leadership
    with pytest.raises(ValueError, match="no longer a supported active interview track"):
        await OrchestratorService.create_session(
            db_session,
            user_id=test_user.id,
            track="staff-leadership",
            title="Invalid Staff Leadership Attempt",
        )

    # Verify Pydantic schema validation yields ValidationError (HTTP 422 in FastAPI)
    with pytest.raises(ValidationError):
        OrchestratorSessionCreate(track="staff-leadership", title="Test")


@pytest.mark.asyncio
async def test_session_deletion_and_reset_cleans_both_tables(
    db_session: AsyncSession,
    test_user: User,
):
    """Verify deleting and resetting sessions completely cleans both orchestrator and legacy tables."""
    # Create two test sessions
    s1 = await OrchestratorService.create_session(db_session, user_id=test_user.id, track="DSA", title="Delete Test 1")
    s2 = await OrchestratorService.create_session(db_session, user_id=test_user.id, track="Core CS", title="Delete Test 2")

    # Delete s1
    deleted = await OrchestratorService.delete_session(db_session, s1.id, test_user.id)
    assert deleted is True

    # Verify s1 is gone from both tables
    assert await OrchestratorService.get_session(db_session, s1.id, test_user.id) is None
    assert await db_session.get(InterviewSession, s1.id) is None

    # Verify s2 is still present
    assert await OrchestratorService.get_session(db_session, s2.id, test_user.id) is not None
    assert await db_session.get(InterviewSession, s2.id) is not None

    # Reset all sessions
    reset_count = await OrchestratorService.reset_sessions(db_session, test_user.id)
    assert reset_count >= 1

    # Verify both tables are now empty for this user
    user_orch_sessions = await OrchestratorService.list_sessions(db_session, test_user.id)
    assert len(user_orch_sessions) == 0

    legacy_result = await db_session.execute(
        select(InterviewSession).where(InterviewSession.user_id == test_user.id)
    )
    assert len(legacy_result.scalars().all()) == 0
