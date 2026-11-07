"""Orchestrator Turn Execution Runner.

Coordinates the complete turn lifecycle:
1. Atomic turn lease reservation & idempotency replay (Stage 0.1)
2. Deterministic Supervisor state analysis & tactical directive
3. Actor Socratic inference (Qwen 2.5 72B)
4. Working memory & milestone progression updates
5. Fenced atomic database commitment (Stage 0.1)
"""

import time
import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.orchestrator_session import OrchestratorSession
from app.orchestrator.actor import InterviewerActor
from app.orchestrator.supervisor import SupervisorEngine
from app.services.orchestrator_service import OrchestratorService


class OrchestratorRunner:
    def __init__(self, actor: InterviewerActor | None = None):
        self.actor = actor or InterviewerActor()

    async def execute_turn(
        self,
        db: AsyncSession,
        session_id: uuid.UUID,
        user_id: uuid.UUID,
        expected_turn_index: int,
        client_turn_id: str,
        candidate_text: str,
    ) -> dict[str, Any]:
        """Executes a complete turn through the deterministic Supervisor and Interviewer Actor."""
        # 1. Atomic turn lease reservation (Stage 0.1)
        res_info = await OrchestratorService.reserve_turn(
            db,
            session_id=session_id,
            user_id=user_id,
            expected_turn_index=expected_turn_index,
            client_turn_id=client_turn_id,
            candidate_text=candidate_text,
            lease_duration_seconds=45,
        )

        # Fast-Path: If already committed, return cached turn immediately
        if res_info["is_cached_replay"]:
            cached = res_info["cached_response"] or {}
            session = await OrchestratorService.get_session(db, session_id, user_id)
            return {
                "session_id": session_id,
                "turn_index": res_info["turn_index"],
                "fencing_token": res_info["fencing_token"],
                "is_cached_replay": True,
                "assistant_response": cached.get("text", ""),
                "delta_metadata": cached.get("delta_metadata", {}),
                "milestone": session.working_memory.get("current_milestone") if session else "",
                "status": "completed",
            }

        fencing_token = res_info["fencing_token"]

        # 2. Load latest session state & evaluate Supervisor Directive
        session = await OrchestratorService.get_session(db, session_id, user_id)
        if session is None:
            raise RuntimeError(f"Session {session_id} not found after reservation")

        directive = SupervisorEngine.evaluate_state(session, candidate_text=candidate_text)

        # 3. Actor generates response & extracts decision metadata
        try:
            assistant_text, delta_metadata, ttft_ms, total_ms = await self.actor.generate_turn(
                directive=directive,
                working_memory=session.working_memory or {},
                transcript=session.transcript or [],
                candidate_text=candidate_text,
            )
        except Exception:
            await OrchestratorService.release_turn_lease(session_id, user_id, fencing_token, client_turn_id)
            raise

        # 3b. Semantic Track Consistency Guard
        from app.orchestrator.track_guard import verify_track_consistency
        from app.orchestrator.milestones import get_milestone_by_id
        is_consistent, violation_reason = verify_track_consistency(session.track, assistant_text)
        if not is_consistent:
            m_def = get_milestone_by_id(session.track, directive.current_milestone_id)
            if m_def and m_def.fallback_probes:
                assistant_text = m_def.fallback_probes[0]
            else:
                assistant_text = (
                    f"Let's focus directly on our {session.track} objectives. "
                    f"Could you walk me through your technical approach and how you evaluate the core constraints?"
                )

        # 4. Update working memory based on extracted metadata & supervisor transition
        new_milestone_id = directive.current_milestone_id if directive.action == "TRANSITION_MILESTONE" else None
        challenged_flaw = directive.target_focus if directive.action == "CHALLENGE_FLAW" else None
        updated_working_memory = SupervisorEngine.update_working_memory_after_turn(
            working_memory=session.working_memory or {},
            delta_metadata=delta_metadata.model_dump(),
            new_milestone_id=new_milestone_id,
            challenged_flaw=challenged_flaw,
            candidate_text=candidate_text,
            assistant_response=assistant_text,
            directive_action=directive.action,
        )
        updated_working_memory = SupervisorEngine.reconcile_dsa_workspace(updated_working_memory, assistant_text)

        # On milestone transition, adaptively select next unexplored topic / question
        # CRITICAL CONSTRAINT: DSA interviews must NEVER change the selected problem halfway through the session!
        if directive.action == "TRANSITION_MILESTONE" and session.track != "DSA":
            try:
                from app.orchestrator.question_intelligence import QuestionIntelligenceEngine
                next_q = await QuestionIntelligenceEngine.select_adaptive_question(
                    db, session.track, updated_working_memory, user_id=user_id
                )
                if next_q:
                    updated_working_memory["current_question"] = next_q
            except Exception:
                pass

        # Check if interview is concluding due to time budget or final conclusion
        session_status = "in_progress"
        if directive.action == "CLOSING_WINDOW":
            updated_working_memory["closing_window_asked"] = True
        if directive.action in ("CONCLUDE_TIME_BUDGET", "CONCLUDE"):
            session_status = "completed"
            updated_working_memory["session_completed"] = True
            updated_working_memory["completion_reason"] = (
                "time_budget_reached" if directive.action == "CONCLUDE_TIME_BUDGET" else "interview_concluded"
            )

        # 5. Atomic commit with fencing token (Stage 0.1)
        committed_session = await OrchestratorService.commit_turn(
            db,
            session_id=session_id,
            user_id=user_id,
            expected_turn_index=expected_turn_index,
            fencing_token=fencing_token,
            client_turn_id=client_turn_id,
            candidate_text=candidate_text,
            assistant_response=assistant_text,
            delta_metadata=delta_metadata.model_dump(),
            working_memory=updated_working_memory,
        )

        if session_status == "completed":
            committed_session.status = "completed"
            await db.commit()

        dsa_info = committed_session.working_memory.get("dsa_problem", {})
        dsa_revealed = dsa_info.get("revealed", False)

        return {
            "session_id": session_id,
            "turn_index": committed_session.turn_index,
            "fencing_token": committed_session.fencing_token,
            "is_cached_replay": False,
            "directive_action": directive.action,
            "assistant_response": assistant_text,
            "delta_metadata": delta_metadata.model_dump(),
            "supervisor_directive": {
                "action": directive.action,
                "milestone": directive.current_milestone_title,
                "target_focus": directive.target_focus,
            },
            "working_memory": committed_session.working_memory,
            "dsa_problem_revealed": dsa_revealed,
            "dsa_problem": dsa_info if dsa_revealed else None,
            "telemetry": {
                "ttft_ms": round(ttft_ms, 1),
                "total_ms": round(total_ms, 1),
            },
            "status": session_status,
        }
