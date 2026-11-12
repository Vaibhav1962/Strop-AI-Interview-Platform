"""FastAPI Router for Orchestrator Endpoints.

Mounts isolated Stage 0.3 routes at `/api/v1/orchestrator`:
- POST /session: Create calibration session
- GET  /session/{session_id}: Read session, transcript, and working memory
- POST /session/{session_id}/turn: Execute full conversational turn
- POST /session/{session_id}/turn/stream: Streaming SSE token delivery
"""

import json
import logging
import uuid
from typing import Any

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.api.rate_limiter import (
    evaluate_limiter,
    limit_user,
    pdf_limiter,
    scratchpad_limiter,
    session_create_limiter,
    turn_limiter,
)
from app.database import get_db, async_session
from app.models.user import User
from app.orchestrator.actor import InterviewerActor
from app.orchestrator.runner import OrchestratorRunner
from app.orchestrator.supervisor import SupervisorEngine
from app.schemas.orchestrator import (
    BarsEvaluationReport,
    EvaluationStatusResponse,
    OrchestratorSessionCreate,
    OrchestratorSessionResponse,
)
from app.services.orchestrator_service import OrchestratorService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/orchestrator", tags=["orchestrator"])
# Provider and database errors can carry URLs, keys or SQL: log them here, tell the browser something generic.
PUBLIC_TURN_ERROR = "The interviewer hit a problem and could not answer. Please try again."
runner = OrchestratorRunner()


def sanitize_dsa_problem_for_client(prob_dict: dict | None) -> dict | None:
    """Strips hidden test cases and private expected values so client bundles never leak solutions."""
    if not prob_dict or not isinstance(prob_dict, dict):
        return prob_dict
    sanitized = dict(prob_dict)
    for key in ("test_cases", "testCases"):
        if key in sanitized and isinstance(sanitized[key], list):
            sanitized[key] = [
                tc for tc in sanitized[key]
                if not tc.get("isHidden") and not tc.get("is_hidden")
            ]
    return sanitized


def sanitize_working_memory_for_client(wm: dict | None) -> dict | None:
    """A copy of working memory that is safe to send to the browser (no hidden tests)."""
    if not isinstance(wm, dict) or not isinstance(wm.get("dsa_problem"), dict):
        return wm
    out = dict(wm)
    out["dsa_problem"] = sanitize_dsa_problem_for_client(wm["dsa_problem"])
    return out


class TurnExecutionRequest(BaseModel):
    client_turn_id: str = Field(min_length=1, max_length=64)
    expected_turn_index: int = Field(ge=0)
    candidate_text: str = Field(min_length=1, max_length=20000)


class CodeSubmissionRequest(BaseModel):
    client_turn_id: str = Field(min_length=1, max_length=64)
    expected_turn_index: int = Field(ge=0)
    code: str = Field(min_length=1, max_length=50000)
    language: str = Field(default="Python", max_length=30)
    test_summary: str | None = None


class ScratchpadUpdateRequest(BaseModel):
    notes: str = Field(max_length=50000)


class TurnExecutionResponse(BaseModel):
    session_id: uuid.UUID
    turn_index: int
    fencing_token: int
    is_cached_replay: bool
    assistant_response: str
    delta_metadata: dict[str, Any]
    supervisor_directive: dict[str, Any] | None = None
    working_memory: dict[str, Any] | None = None
    dsa_problem_revealed: bool = False
    dsa_problem: dict[str, Any] | None = None
    telemetry: dict[str, Any] | None = None
    status: str


@router.post(
    "/session",
    response_model=OrchestratorSessionResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(limit_user(session_create_limiter))],
)
async def create_session(
    payload: OrchestratorSessionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await OrchestratorService.create_session(
        db,
        user_id=current_user.id,
        track=payload.track,
        title=payload.title,
        problem_id=payload.problem_id,
        target_duration_seconds=payload.target_duration_seconds,
    )
    if session and session.working_memory and "dsa_problem" in session.working_memory:
        sanitized_wm = dict(session.working_memory)
        sanitized_wm["dsa_problem"] = sanitize_dsa_problem_for_client(sanitized_wm["dsa_problem"])
        session.working_memory = sanitized_wm
    return session


@router.get("/session/{session_id}", response_model=OrchestratorSessionResponse)
async def get_session(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await OrchestratorService.get_session(db, session_id, current_user.id)
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview session not found")
    if session.working_memory and "dsa_problem" in session.working_memory:
        sanitized_wm = dict(session.working_memory)
        sanitized_wm["dsa_problem"] = sanitize_dsa_problem_for_client(sanitized_wm["dsa_problem"])
        session.working_memory = sanitized_wm
    return session


@router.post(
    "/session/{session_id}/turn",
    response_model=TurnExecutionResponse,
    dependencies=[Depends(limit_user(turn_limiter))],
)
async def execute_turn(
    session_id: uuid.UUID,
    payload: TurnExecutionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await runner.execute_turn(
        db,
        session_id=session_id,
        user_id=current_user.id,
        expected_turn_index=payload.expected_turn_index,
        client_turn_id=payload.client_turn_id,
        candidate_text=payload.candidate_text,
    )
    if result.get("dsa_problem"):
        result["dsa_problem"] = sanitize_dsa_problem_for_client(result["dsa_problem"])
    return result


@router.post(
    "/session/{session_id}/submit-code",
    response_model=TurnExecutionResponse,
    dependencies=[Depends(limit_user(turn_limiter))],
)
async def submit_code(
    session_id: uuid.UUID,
    payload: CodeSubmissionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Authoritative server-side code submission and review turn execution."""
    session = await OrchestratorService.get_session(db, session_id, current_user.id)
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview session not found")

    # Authoritative server-side code update in working memory
    wm = dict(session.working_memory or {})
    wm["submitted_code"] = payload.code
    wm["submitted_language"] = payload.language
    wm["has_unreviewed_code"] = True
    if "dsa_problem" in wm and isinstance(wm["dsa_problem"], dict):
        wm["dsa_problem"]["revealed"] = True

    sk = wm.setdefault("structured_knowledge", {})
    reqs = sk.setdefault("candidate_requests", [])
    if "code_submitted" not in reqs:
        reqs.append("code_submitted")

    session.working_memory = wm
    db.add(session)
    await db.commit()

    candidate_summary = (
        f"[Submitted {payload.language} Implementation]: Candidate submitted solution for code review."
        f"\nAutomated test result: {payload.test_summary or 'not reported'}\n\n"
        f"```{payload.language.lower()}\n{payload.code}\n```"
    )
    result = await runner.execute_turn(
        db,
        session_id=session_id,
        user_id=current_user.id,
        expected_turn_index=payload.expected_turn_index,
        client_turn_id=payload.client_turn_id,
        candidate_text=candidate_summary,
    )
    if result.get("dsa_problem"):
        result["dsa_problem"] = sanitize_dsa_problem_for_client(result["dsa_problem"])
    return result


@router.patch("/session/{session_id}/scratchpad", dependencies=[Depends(limit_user(scratchpad_limiter))])
async def update_scratchpad(
    session_id: uuid.UUID,
    payload: ScratchpadUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Synchronizes candidate scratchpad notes to backend session."""
    session = await OrchestratorService.get_session(db, session_id, current_user.id)
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview session not found")

    wm = dict(session.working_memory or {})
    wm["scratchpad_notes"] = payload.notes
    session.working_memory = wm
    db.add(session)
    await db.commit()
    return {"status": "ok", "notes_length": len(payload.notes)}


@router.post("/session/{session_id}/turn/stream", dependencies=[Depends(limit_user(turn_limiter))])
async def execute_turn_stream(
    session_id: uuid.UUID,
    payload: TurnExecutionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # 1. Atomic lease reservation
    res_info = await OrchestratorService.reserve_turn(
        db,
        session_id=session_id,
        user_id=current_user.id,
        expected_turn_index=payload.expected_turn_index,
        client_turn_id=payload.client_turn_id,
        candidate_text=payload.candidate_text,
        lease_duration_seconds=45,
    )

    if res_info["is_cached_replay"]:
        cached = res_info["cached_response"] or {}

        async def cached_stream():
            yield f"data: {json.dumps({'type': 'final', 'assistant_response': cached.get('text', ''), 'is_cached_replay': True})}\n\n"
            yield "data: [DONE]\n\n"

        return StreamingResponse(cached_stream(), media_type="text/event-stream")

    fencing_token = res_info["fencing_token"]
    session = await OrchestratorService.get_session(db, session_id, current_user.id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    directive = SupervisorEngine.evaluate_state(session, candidate_text=payload.candidate_text)
    actor = InterviewerActor()

    async def sse_event_stream():
        final_response_text = ""
        final_delta = {}

        try:
            async for event in actor.generate_turn_stream(
                directive=directive,
                working_memory=session.working_memory or {},
                transcript=session.transcript or [],
                candidate_text=payload.candidate_text,
            ):
                if event["type"] == "token":
                    yield f"data: {json.dumps({'type': 'token', 'token': event['token']})}\n\n"
                elif event["type"] == "ttft":
                    yield f"data: {json.dumps({'type': 'ttft', 'ttft_ms': event['ttft_ms']})}\n\n"
                elif event["type"] == "final":
                    final_response_text = event["assistant_response"]
                    final_delta = event["delta_metadata"]
        except Exception as exc:
            logger.exception("Orchestrator stream: LLM turn generation failed")
            await OrchestratorService.release_turn_lease(
                session_id, current_user.id, fencing_token, payload.client_turn_id
            )
            yield f"data: {json.dumps({'type': 'error', 'error_type': 'ORCHESTRATOR_INFERENCE_ERROR', 'message': PUBLIC_TURN_ERROR, 'partial_response': final_response_text})}\n\n"
            yield "data: [DONE]\n\n"
            return

        try:
            # Commit turn after stream completes
            new_milestone_id = directive.current_milestone_id if directive.action == "TRANSITION_MILESTONE" else None
            challenged_flaw = directive.target_focus if directive.action == "CHALLENGE_FLAW" else None
            updated_memory = SupervisorEngine.update_working_memory_after_turn(
                working_memory=session.working_memory or {},
                delta_metadata=final_delta,
                new_milestone_id=new_milestone_id,
                challenged_flaw=challenged_flaw,
                candidate_text=payload.candidate_text,
                assistant_response=final_response_text,
                directive_action=directive.action,
            )
            updated_memory = SupervisorEngine.reconcile_dsa_workspace(updated_memory, final_response_text)

            if directive.action == "CLOSING_WINDOW":
                updated_memory["closing_window_asked"] = True
            is_completed = directive.action in ("CONCLUDE_TIME_BUDGET", "CONCLUDE")
            if is_completed:
                updated_memory["session_completed"] = True
                updated_memory["completion_reason"] = (
                    "time_budget_reached" if directive.action == "CONCLUDE_TIME_BUDGET" else "interview_concluded"
                )

            async with async_session() as commit_db:
                committed = await OrchestratorService.commit_turn(
                    commit_db,
                    session_id=session_id,
                    user_id=current_user.id,
                    expected_turn_index=payload.expected_turn_index,
                    fencing_token=fencing_token,
                    client_turn_id=payload.client_turn_id,
                    candidate_text=payload.candidate_text,
                    assistant_response=final_response_text,
                    delta_metadata=final_delta,
                    working_memory=updated_memory,
                )

                if is_completed:
                    committed.status = "completed"
                    await commit_db.commit()

                dsa_prob_info = updated_memory.get("dsa_problem", {})
                dsa_revealed = dsa_prob_info.get("revealed", False)

                target_dur = updated_memory.get("target_duration_seconds", 1800)
                scheduled_dl = updated_memory.get("scheduled_deadline")
                rem_seconds = target_dur
                if scheduled_dl:
                    try:
                        dl_dt = datetime.fromisoformat(scheduled_dl)
                        rem_seconds = max(0, int((dl_dt - datetime.now(timezone.utc)).total_seconds()))
                    except Exception:
                        pass

                yield f"data: {json.dumps({'type': 'committed', 'directive_action': directive.action, 'turn_index': committed.turn_index, 'fencing_token': committed.fencing_token, 'assistant_response': final_response_text, 'delta_metadata': final_delta, 'working_memory': sanitize_working_memory_for_client(updated_memory), 'dsa_problem_revealed': dsa_revealed, 'dsa_problem': sanitize_dsa_problem_for_client(dsa_prob_info if dsa_revealed else None), 'status': committed.status, 'remaining_seconds': rem_seconds, 'scheduled_deadline': updated_memory.get('scheduled_deadline')})}\n\n"
                yield "data: [DONE]\n\n"
        except Exception as exc:
            logger.exception("Orchestrator stream: turn commit failed")
            await OrchestratorService.release_turn_lease(
                session_id, current_user.id, fencing_token, payload.client_turn_id
            )
            yield f"data: {json.dumps({'type': 'error', 'error_type': 'TURN_COMMIT_ERROR', 'message': PUBLIC_TURN_ERROR, 'partial_response': final_response_text})}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(sse_event_stream(), media_type="text/event-stream")


@router.get("/sessions", response_model=list[OrchestratorSessionResponse])
async def list_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Lists all orchestrator interview sessions for the current user."""
    sessions = await OrchestratorService.list_sessions(db, current_user.id)
    return sessions


@router.delete("/session/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Deletes an orchestrator session and its synchronized legacy record."""
    deleted = await OrchestratorService.delete_session(db, session_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview session not found")


@router.delete("/sessions", status_code=status.HTTP_200_OK)
async def reset_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Deletes all interview sessions for the current user."""
    count = await OrchestratorService.reset_sessions(db, current_user.id)
    return {"message": f"Successfully reset {count} interview sessions."}


@router.post(
    "/session/{session_id}/evaluate",
    response_model=BarsEvaluationReport,
    dependencies=[Depends(limit_user(evaluate_limiter))],
)
async def evaluate_session(
    session_id: uuid.UUID,
    force_recompute: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Executes evidence-based BARS evaluation on completed interview session.
    
    If force_recompute is False and an evaluation already exists, returns the cached report.
    """
    report = await OrchestratorService.evaluate_session(
        db,
        session_id=session_id,
        user_id=current_user.id,
        force_recompute=force_recompute,
    )
    return report


@router.get("/session/{session_id}/evaluation", response_model=BarsEvaluationReport)
async def get_session_evaluation(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves generated BARS evaluation report for session."""
    report = await OrchestratorService.get_session_evaluation(
        db,
        session_id=session_id,
        user_id=current_user.id,
    )
    return report


@router.post(
    "/session/{session_id}/evaluate-async",
    response_model=EvaluationStatusResponse,
    dependencies=[Depends(limit_user(evaluate_limiter))],
)
async def evaluate_session_async(
    session_id: uuid.UUID,
    force_recompute: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Starts post-interview qualitative BARS evaluation asynchronously in a background worker."""
    status_payload = await OrchestratorService.start_async_evaluation(
        db,
        session_id=session_id,
        user_id=current_user.id,
        force_recompute=force_recompute,
    )
    return status_payload


@router.get("/session/{session_id}/status", response_model=EvaluationStatusResponse)
async def get_session_status(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Retrieves current interview state and evaluation background status."""
    status_payload = await OrchestratorService.get_session_status(
        db,
        session_id=session_id,
        user_id=current_user.id,
    )
    return status_payload


@router.get("/session/{session_id}/pdf", dependencies=[Depends(limit_user(pdf_limiter))])
async def download_session_pdf(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generates and downloads publication-grade Post-Interview BARS PDF Report directly."""
    session = await OrchestratorService.get_session(
        db,
        session_id=session_id,
        user_id=current_user.id,
    )
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview session not found.",
        )

    report = await OrchestratorService.get_session_evaluation(
        db,
        session_id=session_id,
        user_id=current_user.id,
    )
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Evaluation report not found for this session.",
        )
    candidate_name = current_user.full_name or "Candidate"
    from app.orchestrator.pdf_generator import generate_bars_pdf
    from app.services.orchestrator_service import clean_title, transcript_time

    pdf_bytes = generate_bars_pdf(
        report,
        candidate_name=candidate_name,
        track=session.track,
        transcript=[
            {**t, "time": transcript_time(t, session.created_at)}
            for t in (session.transcript or [])
        ],
    )
    sanitized_title = "".join(
        c for c in (clean_title(report.get("title")).replace(" ", "-") or "Technical-Report") if c.isalnum() or c in "-_"
    ).strip()
    filename = f"Strop_{sanitized_title}_{str(session_id)[:8]}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )



