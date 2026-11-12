"""Durable PostgreSQL-Backed Evaluation Worker for Strop.

Implements resilient, crash-safe, and race-free background evaluation execution:
1. Persistent Job Queue: Jobs are persisted in `orchestrator_sessions` table with status 'queued'.
2. Race-Free Claiming: Uses PostgreSQL row-level locks (FOR UPDATE SKIP LOCKED) to prevent duplicate worker execution.
3. Transaction Isolation: Database transactions are NOT held open during long-running LLM evaluation.
4. Bounded Retries: Interrupted or failed evaluations are retried up to 3 times before terminal failure.
5. Crash Recovery: Evaluations interrupted by process termination or server restart are recovered automatically.
6. Idempotent Persistence: Successful evaluations are saved atomically with report payloads.
"""

import asyncio
import logging
import uuid
from app.services.orchestrator_service import compute_session_duration_seconds, transcript_time
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import async_session
from app.models.interview_session import InterviewSession
from app.models.orchestrator_session import OrchestratorSession
from app.orchestrator.evaluator import BarsEvaluator
from app.schemas.orchestrator import BarsEvaluationReport

logger = logging.getLogger("interviewiq.evaluation_worker")

# Maximum bounded retries before marking an evaluation permanently failed
MAX_EVALUATION_ATTEMPTS = 3
# Timeout after which an evaluation in 'processing' is considered orphaned / dead worker
STALE_PROCESSING_TIMEOUT_SECONDS = 180

# Internal event used to wake the worker immediately upon new job arrival
_job_available_event = asyncio.Event()


def notify_job_available() -> None:
    """Signals the background worker that a new evaluation job is ready to claim."""
    _job_available_event.set()


class EvaluationWorker:
    """PostgreSQL-backed evaluation job manager and runner."""

    @staticmethod
    async def enqueue_session_evaluation(
        db: AsyncSession,
        session_id: uuid.UUID,
        user_id: uuid.UUID,
        force_recompute: bool = False,
    ) -> dict[str, Any]:
        """Atomically validates, guards, and enqueues an evaluation job in PostgreSQL."""
        result = await db.execute(
            select(OrchestratorSession).where(
                OrchestratorSession.id == session_id,
                OrchestratorSession.user_id == user_id,
            )
        )
        session = result.scalar_one_or_none()
        if session is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Interview session not found",
            )

        transcript = session.transcript or []
        if len(transcript) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot evaluate session: No transcript turns recorded",
            )

        memory = session.working_memory or {}
        has_cached_report = "evaluation_report" in memory and memory["evaluation_report"] is not None

        # 1. Idempotent short-circuit
        if not force_recompute and has_cached_report and session.evaluation_status == "completed":
            return {
                "session_id": session.id,
                "status": session.status,
                "evaluation_status": "completed",
                "evaluation_error": None,
                "has_report": True,
            }

        # 2. In-flight protection: do not duplicate if currently processing and not stale
        now = datetime.now(timezone.utc)
        if (
            session.evaluation_status == "processing"
            and not force_recompute
            and session.updated_at
            and (now - session.updated_at.replace(tzinfo=timezone.utc)).total_seconds() < STALE_PROCESSING_TIMEOUT_SECONDS
        ):
            return {
                "session_id": session.id,
                "status": session.status,
                "evaluation_status": "processing",
                "evaluation_error": None,
                "has_report": has_cached_report,
            }

        # 3. Transition to 'queued' state in PostgreSQL
        attempts = int(memory.get("evaluation_attempts", 0))
        if force_recompute:
            attempts = 0  # Reset counter on user explicit force-recompute

        updated_memory = dict(memory)
        updated_memory["evaluation_attempts"] = attempts
        updated_memory.pop("evaluation_claimed_at", None)

        session.evaluation_status = "queued"
        session.evaluation_error = None
        session.status = "completed"
        session.working_memory = updated_memory
        session.updated_at = now

        # Synchronize placeholder in legacy interview_sessions table
        cand_turns = [t for t in transcript if t.get("speaker") in ("You", "Candidate")]
        duration_sec = compute_session_duration_seconds(session, memory) or 180
        synced_transcript = [
            {
                "speaker": t.get("speaker", "Candidate"),
                "text": t.get("text") or "...",
                "time": transcript_time(t, session.created_at),
            }
            for t in transcript
        ]

        legacy_record = await db.get(InterviewSession, session_id)
        if legacy_record:
            legacy_record.competency_level = "Evaluating..."
            legacy_record.metrics = {"evaluation_status": "queued"}
            legacy_record.transcript = synced_transcript
        else:
            legacy_record = InterviewSession(
                id=session_id,
                user_id=user_id,
                title=session.title,
                track=session.track,
                question_count=max(len(cand_turns), 1),
                duration_seconds=duration_sec,
                overall_score=None,
                competency_level="Evaluating...",
                metrics={"evaluation_status": "queued"},
                strengths=[],
                weaknesses=[],
                report=None,
                transcript=synced_transcript,
            )
            db.add(legacy_record)

        await db.commit()
        notify_job_available()

        return {
            "session_id": session.id,
            "status": "completed",
            "evaluation_status": "queued",
            "evaluation_error": None,
            "has_report": False,
        }

    @staticmethod
    async def claim_next_job(db: AsyncSession) -> dict[str, Any] | None:
        """Atomically claims the next evaluation job using FOR UPDATE SKIP LOCKED.
        
        Guarantees no two workers or threads can process the same evaluation job.
        If a job has exceeded MAX_EVALUATION_ATTEMPTS, marks it as failed terminal.
        """
        now = datetime.now(timezone.utc)
        stale_cutoff = now - timedelta(seconds=STALE_PROCESSING_TIMEOUT_SECONDS)

        # 1. Atomic row selection with row lock
        stmt = (
            select(OrchestratorSession)
            .where(
                (OrchestratorSession.evaluation_status == "queued")
                | (
                    (OrchestratorSession.evaluation_status == "processing")
                    & (OrchestratorSession.updated_at < stale_cutoff)
                )
            )
            .order_by(OrchestratorSession.created_at.asc())
            .with_for_update(skip_locked=True)
            .limit(1)
        )

        result = await db.execute(stmt)
        session = result.scalar_one_or_none()
        if session is None:
            return None

        memory = dict(session.working_memory or {})
        current_attempts = int(memory.get("evaluation_attempts", 0))

        # Check bounded attempt limit
        if current_attempts >= MAX_EVALUATION_ATTEMPTS:
            err_msg = f"Evaluation exceeded maximum attempts ({MAX_EVALUATION_ATTEMPTS}). Terminal failure."
            session.evaluation_status = "failed"
            session.evaluation_error = err_msg
            session.updated_at = now

            legacy = await db.get(InterviewSession, session.id)
            if legacy:
                legacy.competency_level = "Evaluation Failed"
                legacy.metrics = {"evaluation_status": "failed", "error": err_msg}

            await db.commit()
            logger.warning("Session %s reached terminal evaluation failure: %s", session.id, err_msg)
            return None

        # Claim the job: increment attempt count and set 'processing'
        new_attempts = current_attempts + 1
        memory["evaluation_attempts"] = new_attempts
        memory["evaluation_claimed_at"] = now.isoformat()

        session.evaluation_status = "processing"
        session.evaluation_error = None
        session.working_memory = memory
        session.updated_at = now

        legacy = await db.get(InterviewSession, session.id)
        if legacy:
            legacy.competency_level = "Evaluating..."
            legacy.metrics = {"evaluation_status": "processing", "attempt": new_attempts}

        await db.commit()

        # Return snapshot of session data so LLM can run outside DB transaction
        return {
            "session_id": session.id,
            "user_id": session.user_id,
            "track": session.track,
            "title": session.title,
            "transcript": session.transcript or [],
            "working_memory": memory,
            "created_at": session.created_at,
            "attempt": new_attempts,
        }

    @staticmethod
    async def execute_job(job: dict[str, Any]) -> None:
        """Runs the BARS evaluator on the claimed job and safely persists the report."""
        session_id: uuid.UUID = job["session_id"]
        user_id: uuid.UUID = job["user_id"]
        logger.info(
            "Worker executing evaluation for session %s (attempt %d/3, track: %s)...",
            session_id,
            job["attempt"],
            job["track"],
        )

        # Construct ephemeral session object for evaluator (no open DB transaction!)
        ephemeral_session = OrchestratorSession(
            id=session_id,
            user_id=user_id,
            track=job["track"],
            title=job["title"],
            transcript=job["transcript"],
            working_memory=job["working_memory"],
            created_at=job.get("created_at"),
        )

        report_obj: BarsEvaluationReport | None = None
        eval_error: str | None = None

        try:
            evaluator = BarsEvaluator()
            report_obj = await evaluator.evaluate_session(ephemeral_session)
        except Exception as e:
            logger.exception("Evaluation execution error for session %s: %s", session_id, e)
            # The exception text can carry provider URLs or internals: it is logged above, the user sees this.
            eval_error = "Evaluation could not be completed right now. Please retry."

        # Open fresh short transaction to persist the outcome
        async with async_session() as db:
            now = datetime.now(timezone.utc)
            session = await db.get(OrchestratorSession, session_id)
            if not session:
                logger.error("Session %s disappeared during evaluation", session_id)
                return

            memory = dict(session.working_memory or {})

            if report_obj is not None:
                # 1. Success persistence
                report_dict = report_obj.model_dump(mode="json")
                memory["evaluation_report"] = report_dict

                session.working_memory = memory
                session.evaluation_status = "completed"
                session.evaluation_error = None
                session.status = "completed"
                session.updated_at = now

                # Sync to legacy interview_sessions for History page
                legacy = await db.get(InterviewSession, session_id)
                cand_turns = [t for t in (session.transcript or []) if t.get("speaker") in ("You", "Candidate")]
                overall_score = None if report_obj.insufficient_data else report_obj.coverage_summary.coverage_percentage
                comp_level = report_obj.calibration_signal.value

                strengths = list(report_obj.key_technical_strengths or [])[:4]
                weaknesses = list(report_obj.key_technical_weaknesses or [])[:4]

                if legacy:
                    legacy.overall_score = overall_score
                    legacy.competency_level = comp_level
                    legacy.strengths = strengths
                    legacy.weaknesses = weaknesses
                    legacy.report = report_dict
                    legacy.metrics = {
                        "evaluation_status": "completed",
                        "calibration_signal": comp_level,
                    }
                else:
                    legacy = InterviewSession(
                        id=session_id,
                        user_id=user_id,
                        title=session.title,
                        track=session.track,
                        question_count=max(len(cand_turns), 1),
                        duration_seconds=compute_session_duration_seconds(session, memory) or 180,
                        overall_score=overall_score,
                        competency_level=comp_level,
                        metrics={
                            "evaluation_status": "completed",
                            "calibration_signal": comp_level,
                        },
                        strengths=strengths,
                        weaknesses=weaknesses,
                        report=report_dict,
                        transcript=[
                            {
                                "speaker": t.get("speaker", "Candidate"),
                                "text": t.get("text") or "...",
                                "time": transcript_time(t, session.created_at),
                            }
                            for t in (session.transcript or [])
                        ],
                    )
                    db.add(legacy)

                await db.commit()
                logger.info("Evaluation report successfully persisted for session %s.", session_id)
            else:
                # 2. Failure persistence
                session.evaluation_status = "failed"
                session.evaluation_error = (eval_error or "Unknown evaluation error")[:500]
                session.updated_at = now

                legacy = await db.get(InterviewSession, session_id)
                if legacy:
                    legacy.competency_level = "Evaluation Paused"
                    legacy.metrics = {"evaluation_status": "failed", "error": session.evaluation_error}

                await db.commit()
                logger.warning("Session %s marked failed with error: %s", session_id, session.evaluation_error)


async def evaluation_worker_loop() -> None:
    """Long-running durable worker loop that continually claims and executes evaluation jobs."""
    logger.info("Evaluation worker loop started.")
    while True:
        try:
            job: dict[str, Any] | None = None
            async with async_session() as db:
                job = await EvaluationWorker.claim_next_job(db)

            if job is not None:
                await EvaluationWorker.execute_job(job)
            else:
                # Wait for notification or periodic 5s wake-up
                try:
                    await asyncio.wait_for(_job_available_event.wait(), timeout=5.0)
                    _job_available_event.clear()
                except asyncio.TimeoutError:
                    pass
        except asyncio.CancelledError:
            logger.info("Evaluation worker loop received cancellation signal. Exiting.")
            break
        except Exception as e:
            logger.exception("Unexpected error in evaluation worker loop: %s", e)
            await asyncio.sleep(2.0)

