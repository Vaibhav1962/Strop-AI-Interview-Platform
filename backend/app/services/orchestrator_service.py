import json
import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.interview_session import InterviewSession
from app.models.orchestrator_session import OrchestratorSession
from app.schemas.orchestrator import BarsEvaluationReport, compute_payload_hash

logger = logging.getLogger("services.orchestrator_service")



def clean_title(title: str | None) -> str:
    """Session titles never include the word "Calibration" (older sessions were saved with it)."""
    import re

    t = re.sub(r"\s*\bcalibration\b", "", title or "", flags=re.I)
    t = re.sub(r"\s{2,}", " ", t).strip()
    if not t:
        return "Interview"
    return "Technical Interview" if t.lower() == "technical round" else t


def _as_utc(dt):
    if dt is None:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def transcript_time(entry, created_at) -> str:
    """mm:ss since the session started for a transcript entry (stored 'time', else derived from its ISO timestamp)."""
    stored = (entry or {}).get("time")
    if stored and stored != "00:00":
        return stored
    try:
        ts = datetime.fromisoformat(str(entry.get("timestamp")))
        secs = max(0, int((_as_utc(ts) - _as_utc(created_at)).total_seconds()))
        return f"{secs // 60:02d}:{secs % 60:02d}"
    except Exception:
        return stored or "00:00"


def compute_session_duration_seconds(session, memory=None) -> int:
    """Real interview length: the last transcript timestamp (the UI's own elapsed clock), else wall-clock span."""
    memory = memory if memory is not None else (getattr(session, "working_memory", None) or {})
    best = 0
    for t in (getattr(session, "transcript", None) or []):
        parts = str((t or {}).get("time") or "").split(":")
        try:
            nums = [int(x) for x in parts]
        except ValueError:
            continue
        if len(nums) == 2:
            best = max(best, nums[0] * 60 + nums[1])
        elif len(nums) == 3:
            best = max(best, nums[0] * 3600 + nums[1] * 60 + nums[2])
    created = getattr(session, "created_at", None)
    for t in (getattr(session, "transcript", None) or []):
        try:
            ts = datetime.fromisoformat(str((t or {}).get("timestamp")))
            best = max(best, int((_as_utc(ts) - _as_utc(created)).total_seconds()))
        except Exception:
            pass
    if best <= 0:
        created, updated = getattr(session, "created_at", None), getattr(session, "updated_at", None)
        if created and updated:
            best = max(0, int((updated - created).total_seconds()))
    return max(best, int(memory.get("deliberation_seconds_spent", 0) or 0))


class OrchestratorService:
    @staticmethod
    async def create_session(
        db: AsyncSession,
        user_id: uuid.UUID,
        track: str = "System Design",
        title: str = "Technical Interview",
        problem_id: str | None = None,
        target_duration_seconds: int = 1800,
    ) -> OrchestratorSession:
        from app.orchestrator.milestones import get_milestones_for_track, normalize_track

        canonical_track = normalize_track(track)
        milestones = get_milestones_for_track(canonical_track)
        initial_milestone = milestones[0].id

        now = datetime.now(timezone.utc)
        safe_duration = max(300, min(7200, target_duration_seconds))
        deadline = now + timedelta(seconds=safe_duration)

        memory = {
            "track": canonical_track,
            "target_duration_seconds": safe_duration,
            "scheduled_deadline": deadline.isoformat(),
            "session_started_at": now.isoformat(),
            "current_milestone": initial_milestone,
            "milestone_history": [initial_milestone],
            "milestone_turn_counts": {initial_milestone: 0},
            "architectural_facts": [],
            "confirmed_vulnerabilities": [],
            "deliberation_seconds_spent": 0,
            "stagnation_turn_count": 0,
        }

        # Adaptive Question Intelligence Selection (Phase 4 Unified Engine)
        try:
            from app.models.user_profile import UserProfile
            candidate_profile = None
            if user_id:
                prof_res = await db.execute(select(UserProfile).where(UserProfile.user_id == user_id))
                user_prof = prof_res.scalar_one_or_none()
                if user_prof and user_prof.resume_data:
                    candidate_profile = user_prof.resume_data

            from app.orchestrator.question_intelligence import QuestionIntelligenceEngine
            explicit_id = problem_id if (problem_id and problem_id != "default") else None
            selected_q = await QuestionIntelligenceEngine.select_adaptive_question(
                db,
                canonical_track,
                memory,
                user_id=user_id,
                candidate_profile=candidate_profile,
                requested_problem_id=explicit_id,
            )
            if selected_q:
                memory["current_question"] = selected_q
        except Exception as q_err:
            logger.warning("[OrchestratorService] Question intelligence fallback: %s", q_err)

        # Fallback DSA problem initialization only if not already set by QuestionIntelligenceEngine
        if canonical_track == "DSA" and "dsa_problem" not in memory:
            memory["dsa_problem"] = {
                "id": "longest-substring",
                "problem_id": "longest-substring",
                "title": "Longest Substring Without Repeating Characters",
                "difficulty": "Medium",
                "tagline": "Sliding window, frequency hash map, two pointers",
                "description": "Given a string s, find the length of the longest substring without duplicate characters.",
                "constraints": ["0 <= s.length <= 5 * 10^4", "s consists of English letters, digits, symbols, and spaces."],
                "examples": [{"input": "s = 'abcabcbb'", "output": "3"}],
                "optimal_time_complexity": "O(N)",
                "optimal_space_complexity": "O(min(N, Sigma))",
                "entry_point": "lengthOfLongestSubstring",
                "args": [{"name": "s", "type": "string"}],
                "return_type": "number",
                "templates": {
                    "Python": "class Solution:\n    def lengthOfLongestSubstring(self, s: str) -> int:\n        pass\n",
                    "JavaScript": "function lengthOfLongestSubstring(s) {\n}\n",
                },
                "test_cases": [],
                "revealed": False,
                "revealed_at_turn": None,
            }

        session_id = uuid.uuid4()
        session = OrchestratorSession(
            id=session_id,
            user_id=user_id,
            track=canonical_track,
            title=clean_title(title),
            status="in_progress",
            evaluation_status="idle",
            evaluation_error=None,
            turn_index=0,
            fencing_token=0,
            working_memory=memory,
            transcript=[],
            idempotency_keys={},
        )
        db.add(session)

        # Synchronize new active session to interview_sessions table so
        # that History, Dashboard, and Legacy APIs see it immediately
        legacy_session = InterviewSession(
            id=session_id,
            user_id=user_id,
            title=title,
            track=canonical_track,
            question_count=1,
            duration_seconds=0,
            overall_score=None,
            competency_level="In Progress",
            metrics={"evaluation_status": "idle"},
            strengths=[],
            weaknesses=[],
            report=None,
            transcript=[],
        )
        db.add(legacy_session)

        await db.commit()
        await db.refresh(session)
        return session

    @staticmethod
    async def get_session(
        db: AsyncSession,
        session_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> OrchestratorSession | None:
        result = await db.execute(
            select(OrchestratorSession)
            .where(
                OrchestratorSession.id == session_id,
                OrchestratorSession.user_id == user_id,
            )
            .execution_options(populate_existing=True)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def reserve_turn(
        db: AsyncSession,
        session_id: uuid.UUID,
        user_id: uuid.UUID,
        expected_turn_index: int,
        client_turn_id: str,
        candidate_text: str,
        lease_duration_seconds: int = 45,
    ) -> dict[str, Any]:
        """Atomically reserves a turn lease for model inference.

        Returns a dictionary containing:
        - `is_cached_replay`: bool
        - `cached_response`: dict | None
        - `turn_index`: int
        - `fencing_token`: int
        - `payload_hash`: str
        - `expires_at`: datetime | None
        """
        payload_hash = compute_payload_hash(candidate_text)
        now = datetime.now(timezone.utc)
        now_iso = now.isoformat()

        # 1. Ownership & state inspection
        session = await OrchestratorService.get_session(db, session_id, user_id)
        if session is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview session not found")

        if session.status != "in_progress":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Interview session is not active")

        # 2. Check durable idempotency ledger
        idempotency_keys = session.idempotency_keys or {}
        existing_record = idempotency_keys.get(client_turn_id)

        if existing_record:
            stored_hash = existing_record.get("payload_hash")
            if stored_hash != payload_hash:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="client_turn_id reused with conflicting payload_hash",
                )

            # Scenario 4: Already committed -> return cached turn directly
            if existing_record.get("committed") is True:
                cached_turn_idx = existing_record.get("turn_index", expected_turn_index)
                # Find matching assistant line from transcript
                matching_entry = None
                for line in session.transcript:
                    if line.get("turn_index") == cached_turn_idx and line.get("speaker") == "Alex":
                        matching_entry = line
                        break

                return {
                    "is_cached_replay": True,
                    "cached_response": matching_entry,
                    "turn_index": cached_turn_idx,
                    "fencing_token": session.fencing_token,
                    "payload_hash": payload_hash,
                    "expires_at": None,
                }

            # Scenario 2: Still in-flight and lease not expired
            if session.in_flight_expires_at and session.in_flight_expires_at > now:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Turn is currently being processed by another worker",
                    headers={"Retry-After": "2"},
                )

        # 3. Verify turn index expectation if not a committed replay
        if session.turn_index != expected_turn_index:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Turn index mismatch: expected {session.turn_index}, got {expected_turn_index}",
            )

        # 4. Atomic conditional reservation SQL
        expires_at = now + timedelta(seconds=lease_duration_seconds)
        record = {
            "payload_hash": payload_hash,
            "turn_index": expected_turn_index,
            "committed": False,
            "reserved_at": now_iso,
        }
        record_json = json.dumps(record)
        key_path = [client_turn_id]

        stmt = text(
            """
            UPDATE orchestrator_sessions
            SET in_flight_turn_id = :client_turn_id,
                in_flight_payload_hash = :payload_hash,
                in_flight_expires_at = :expires_at,
                fencing_token = fencing_token + 1,
                idempotency_keys = jsonb_set(
                    idempotency_keys,
                    :key_path,
                    CAST(:record_json AS jsonb),
                    true
                )
            WHERE id = :session_id
              AND user_id = :user_id
              AND turn_index = :expected_turn_index
              AND status = 'in_progress'
              AND (in_flight_expires_at IS NULL OR in_flight_expires_at < :now)
              AND (
                  NOT jsonb_exists(idempotency_keys, :client_turn_id)
                  OR (
                      (idempotency_keys->:client_turn_id->>'payload_hash') = :payload_hash
                      AND CAST(idempotency_keys->:client_turn_id->>'committed' AS boolean) IS FALSE
                  )
              )
            RETURNING fencing_token, turn_index, in_flight_expires_at;
            """
        )

        result = await db.execute(
            stmt,
            {
                "session_id": session_id,
                "user_id": user_id,
                "expected_turn_index": expected_turn_index,
                "client_turn_id": client_turn_id,
                "payload_hash": payload_hash,
                "expires_at": expires_at,
                "key_path": key_path,
                "record_json": record_json,
                "now": now,
            },
        )
        row = result.fetchone()

        if row is None:
            # Re-read to diagnose race condition cause
            refreshed = await OrchestratorService.get_session(db, session_id, user_id)
            if refreshed and refreshed.in_flight_turn_id == client_turn_id:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Turn is currently being processed by another worker",
                    headers={"Retry-After": "2"},
                )
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Turn reservation conflict: lease could not be acquired",
            )

        await db.commit()
        return {
            "is_cached_replay": False,
            "cached_response": None,
            "turn_index": row.turn_index,
            "fencing_token": row.fencing_token,
            "payload_hash": payload_hash,
            "expires_at": row.in_flight_expires_at,
        }

    @staticmethod
    async def renew_turn_lease(
        db: AsyncSession,
        session_id: uuid.UUID,
        user_id: uuid.UUID,
        expected_turn_index: int,
        fencing_token: int,
        extension_seconds: int = 30,
    ) -> bool:
        """Extends an active turn lease to support long-running inference requests."""
        now = datetime.now(timezone.utc)
        new_expires = now + timedelta(seconds=extension_seconds)
        stmt = text(
            """
            UPDATE orchestrator_sessions
            SET in_flight_expires_at = :new_expires
            WHERE id = :session_id
              AND user_id = :user_id
              AND turn_index = :expected_turn_index
              AND fencing_token = :fencing_token
              AND status = 'in_progress'
              AND in_flight_expires_at IS NOT NULL
              AND in_flight_expires_at >= :now
            RETURNING fencing_token;
            """
        )
        result = await db.execute(
            stmt,
            {
                "session_id": session_id,
                "user_id": user_id,
                "expected_turn_index": expected_turn_index,
                "fencing_token": fencing_token,
                "new_expires": new_expires,
                "now": now,
            },
        )
        row = result.fetchone()
        if row is None:
            return False
        await db.commit()
        return True

    @staticmethod
    async def release_turn_lease(
        session_id: uuid.UUID,
        user_id: uuid.UUID,
        fencing_token: int,
        client_turn_id: str,
    ) -> None:
        """Drops an uncommitted reservation after a failed generation so the candidate can retry immediately
        instead of waiting out the 45s lease (which surfaced as 'lease could not be acquired' 409s)."""
        from app.database import async_session

        try:
            async with async_session() as release_db:
                await release_db.execute(
                    text(
                        """
                        UPDATE orchestrator_sessions
                        SET in_flight_turn_id = NULL,
                            in_flight_payload_hash = NULL,
                            in_flight_expires_at = NULL,
                            idempotency_keys = idempotency_keys - CAST(:client_turn_id AS text)
                        WHERE id = :session_id
                          AND user_id = :user_id
                          AND fencing_token = :fencing_token
                          AND in_flight_turn_id = :client_turn_id;
                        """
                    ),
                    {
                        "session_id": session_id,
                        "user_id": user_id,
                        "fencing_token": fencing_token,
                        "client_turn_id": client_turn_id,
                    },
                )
                await release_db.commit()
        except Exception:
            logger.exception("Failed to release turn lease for session %s", session_id)

    @staticmethod
    async def commit_turn(
        db: AsyncSession,
        session_id: uuid.UUID,
        user_id: uuid.UUID,
        expected_turn_index: int,
        fencing_token: int,
        client_turn_id: str,
        candidate_text: str,
        assistant_response: str,
        delta_metadata: dict[str, Any] | None = None,
        working_memory: dict[str, Any] | None = None,
    ) -> OrchestratorSession:
        """Atomically commits a turn with fencing token verification."""
        payload_hash = compute_payload_hash(candidate_text)
        now = datetime.now(timezone.utc)
        now_iso = now.isoformat()

        session = await OrchestratorService.get_session(db, session_id, user_id)
        if session is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview session not found")

        # Fast-path replay check
        idempotency_keys = session.idempotency_keys or {}
        existing = idempotency_keys.get(client_turn_id)
        if existing and existing.get("committed") is True:
            if existing.get("payload_hash") != payload_hash:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="client_turn_id reused with conflicting payload_hash",
                )
            return session

        # Prepare transcript entries to append
        _elapsed = max(0, int((now - _as_utc(session.created_at)).total_seconds())) if session.created_at else 0
        _clock = f"{_elapsed // 60:02d}:{_elapsed % 60:02d}"
        candidate_entry = {
            "time": _clock,
            "turn_index": expected_turn_index,
            "client_turn_id": client_turn_id,
            "speaker": "Candidate",
            "text": candidate_text,
            "payload_hash": payload_hash,
            "timestamp": now_iso,
        }
        assistant_entry = {
            "time": _clock,
            "turn_index": expected_turn_index,
            "speaker": "Alex",
            "text": assistant_response,
            "delta_metadata": delta_metadata or {},
            "timestamp": now_iso,
        }
        new_entries_json = json.dumps([candidate_entry, assistant_entry])

        # Update working memory state
        if working_memory is None:
            working_memory = dict(session.working_memory or {})
            if delta_metadata:
                if "technical_claims" in delta_metadata:
                    working_memory.setdefault("architectural_facts", []).extend(delta_metadata["technical_claims"])
                if "identified_vulnerabilities" in delta_metadata:
                    working_memory.setdefault("confirmed_vulnerabilities", []).extend(
                        delta_metadata["identified_vulnerabilities"]
                    )
        working_memory_json = json.dumps(working_memory)

        commit_record = {
            "payload_hash": payload_hash,
            "turn_index": expected_turn_index,
            "committed": True,
            "committed_at": now_iso,
        }
        commit_record_json = json.dumps(commit_record)
        key_path = [client_turn_id]

        stmt = text(
            """
            UPDATE orchestrator_sessions
            SET turn_index = turn_index + 1,
                fencing_token = fencing_token + 1,
                in_flight_turn_id = NULL,
                in_flight_payload_hash = NULL,
                in_flight_expires_at = NULL,
                transcript = transcript || CAST(:new_entries AS jsonb),
                working_memory = CAST(:working_memory AS jsonb),
                idempotency_keys = jsonb_set(
                    idempotency_keys,
                    :key_path,
                    CAST(:commit_record_json AS jsonb),
                    true
                )
            WHERE id = :session_id
              AND user_id = :user_id
              AND turn_index = :expected_turn_index
              AND fencing_token = :fencing_token
              AND status = 'in_progress'
            RETURNING id;
            """
        )

        result = await db.execute(
            stmt,
            {
                "session_id": session_id,
                "user_id": user_id,
                "expected_turn_index": expected_turn_index,
                "fencing_token": fencing_token,
                "key_path": key_path,
                "commit_record_json": commit_record_json,
                "new_entries": new_entries_json,
                "working_memory": working_memory_json,
            },
        )
        row = result.fetchone()

        if row is None:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Turn commit rejected: stale fencing token or concurrent turn completion",
            )

        await db.commit()
        refreshed = await OrchestratorService.get_session(db, session_id, user_id)

        # Synchronize transcript and duration to legacy interview_sessions table
        try:
            legacy = await db.get(InterviewSession, session_id)
            if legacy and refreshed:
                cand_turns = [t for t in (refreshed.transcript or []) if t.get("speaker") in ("You", "Candidate")]
                legacy.question_count = max(len(cand_turns), 1)
                duration_sec = compute_session_duration_seconds(refreshed)
                if duration_sec > 0:
                    legacy.duration_seconds = duration_sec
                legacy.transcript = [
                    {
                        "speaker": t.get("speaker", "Candidate"),
                        "text": t.get("text", ""),
                        "time": transcript_time(t, refreshed.created_at),
                    }
                    for t in (refreshed.transcript or [])
                ]
                await db.commit()
        except Exception:
            pass

        return refreshed

    @staticmethod
    async def list_sessions(
        db: AsyncSession,
        user_id: uuid.UUID,
    ) -> list[OrchestratorSession]:
        """Lists all orchestrator interview sessions for the user, newest first."""
        result = await db.execute(
            select(OrchestratorSession)
            .where(OrchestratorSession.user_id == user_id)
            .order_by(OrchestratorSession.created_at.desc())
        )
        return list(result.scalars().all())

    @staticmethod
    async def delete_session(
        db: AsyncSession,
        session_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> bool:
        """Deletes session from orchestrator_sessions and synchronized legacy interview_sessions."""
        from sqlalchemy import delete
        await db.execute(
            delete(InterviewSession).where(
                InterviewSession.id == session_id,
                InterviewSession.user_id == user_id,
            )
        )
        result = await db.execute(
            delete(OrchestratorSession).where(
                OrchestratorSession.id == session_id,
                OrchestratorSession.user_id == user_id,
            )
        )
        await db.commit()
        return result.rowcount > 0

    @staticmethod
    async def reset_sessions(
        db: AsyncSession,
        user_id: uuid.UUID,
    ) -> int:
        """Deletes all sessions for user from both orchestrator and legacy tables."""
        from sqlalchemy import delete
        await db.execute(delete(InterviewSession).where(InterviewSession.user_id == user_id))
        result = await db.execute(delete(OrchestratorSession).where(OrchestratorSession.user_id == user_id))
        await db.commit()
        return result.rowcount

    @staticmethod
    async def evaluate_session(
        db: AsyncSession,
        session_id: uuid.UUID,
        user_id: uuid.UUID,
        evaluator: Any | None = None,
        force_recompute: bool = False,
    ) -> Any:
        """Executes post-interview qualitative BARS evaluation and stores report in session working memory.
        
        Idempotent: If an evaluation report already exists in working memory and force_recompute is False,
        returns the existing cached report without re-invoking the model.
        Also synchronizes the completed evaluation to the legacy interview_sessions table for History compatibility.
        """
        session = await OrchestratorService.get_session(db, session_id, user_id)
        if session is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview session not found")

        transcript = session.transcript or []
        if len(transcript) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot evaluate session: No transcript turns recorded",
            )

        # 1. Idempotency Check: Return existing evaluation if present
        existing_memory = session.working_memory or {}
        if not force_recompute and "evaluation_report" in existing_memory:
            cached_report_dict = existing_memory["evaluation_report"]
            if cached_report_dict:
                if session.evaluation_status != "completed":
                    now = datetime.now(timezone.utc)
                    await db.execute(
                        text(
                            """
                            UPDATE orchestrator_sessions
                            SET evaluation_status = 'completed',
                                evaluation_error = NULL,
                                status = 'completed',
                                updated_at = :now
                            WHERE id = :session_id AND user_id = :user_id;
                            """
                        ),
                        {"session_id": session_id, "user_id": user_id, "now": now},
                    )
                    await db.commit()
                return BarsEvaluationReport.model_validate(cached_report_dict)

        # 2. Execute BARS evaluation
        from app.orchestrator.evaluator import BarsEvaluator
        eval_engine = evaluator or BarsEvaluator()
        report = await eval_engine.evaluate_session(session)

        # 3. Persist evaluation report into orchestrator_sessions working memory
        updated_memory = dict(existing_memory)
        rep_dump = report.model_dump(mode="json")
        updated_memory["evaluation_report"] = rep_dump

        stmt = text(
            """
            UPDATE orchestrator_sessions
            SET status = 'completed',
                evaluation_status = 'completed',
                evaluation_error = NULL,
                working_memory = CAST(:working_memory AS jsonb),
                updated_at = :now
            WHERE id = :session_id AND user_id = :user_id;
            """
        )
        now = datetime.now(timezone.utc)
        await db.execute(
            stmt,
            {
                "session_id": session_id,
                "user_id": user_id,
                "working_memory": json.dumps(updated_memory),
                "now": now,
            },
        )

        # 4. Synchronize with legacy interview_sessions table for Dashboard & History compatibility
        cand_turns = [t for t in transcript if t.get("speaker") in ("You", "Candidate")]
        duration_sec = compute_session_duration_seconds(session, updated_memory) or 180
        synced_transcript = [
            {
                "speaker": t.get("speaker", "Candidate"),
                "text": t.get("text") or "...",
                "time": transcript_time(t, session.created_at),
            }
            for t in transcript
        ]

        existing_legacy = await db.get(InterviewSession, session_id)
        if existing_legacy:
            existing_legacy.overall_score = None  # Qualitative BARS does not use arbitrary 0-100 score
            existing_legacy.competency_level = report.calibration_signal.value
            existing_legacy.strengths = report.key_technical_strengths
            existing_legacy.weaknesses = report.key_technical_weaknesses
            existing_legacy.report = rep_dump
            existing_legacy.transcript = synced_transcript
            existing_legacy.duration_seconds = duration_sec
        else:
            legacy_record = InterviewSession(
                id=session_id,
                user_id=user_id,
                title=session.title,
                track=session.track,
                question_count=max(len(cand_turns), 1),
                duration_seconds=duration_sec,
                overall_score=None,
                competency_level=report.calibration_signal.value,
                metrics={
                    "calibration_signal": report.calibration_signal.value,
                    "coverage_percentage": report.coverage_summary.coverage_percentage,
                    "demonstrated_count": report.coverage_summary.demonstrated_count,
                    "insufficient_coverage_count": report.coverage_summary.insufficient_coverage_count,
                },
                strengths=report.key_technical_strengths,
                weaknesses=report.key_technical_weaknesses,
                report=rep_dump,
                transcript=synced_transcript,
            )
            db.add(legacy_record)

        await db.commit()
        return report



    @staticmethod
    async def get_session_evaluation(
        db: AsyncSession,
        session_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> dict[str, Any] | None:
        """Retrieves previously generated BARS evaluation report for session."""
        session = await OrchestratorService.get_session(db, session_id, user_id)
        if session is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview session not found")

        memory = session.working_memory or {}
        report = memory.get("evaluation_report")
        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Evaluation report not found for this session. Run POST /evaluate first.",
            )
        return report

    @staticmethod
    async def run_async_evaluation_task(
        session_id: uuid.UUID,
        user_id: uuid.UUID,
        force_recompute: bool = False,
    ):
        """Worker task executed in background to run BARS evaluation without blocking HTTP response."""
        import logging
        from app.database import async_session

        logger = logging.getLogger(__name__)
        try:
            async with async_session() as db:
                await OrchestratorService.evaluate_session(
                    db,
                    session_id=session_id,
                    user_id=user_id,
                    force_recompute=force_recompute,
                )
        except Exception as e:
            logger.exception("Background BARS evaluation failed for session %s: %s", session_id, e)
            try:
                async with async_session() as db:
                    now = datetime.now(timezone.utc)
                    await db.execute(
                        text(
                            """
                            UPDATE orchestrator_sessions
                            SET evaluation_status = 'failed',
                                evaluation_error = :error_msg,
                                updated_at = :now
                            WHERE id = :session_id AND user_id = :user_id;
                            """
                        ),
                        {
                            "session_id": session_id,
                            "user_id": user_id,
                            "error_msg": "Evaluation could not be completed right now. Please retry.",
                            "now": now,
                        },
                    )
                    legacy = await db.get(InterviewSession, session_id)
                    if legacy:
                        legacy.competency_level = "Evaluation Paused"
                        legacy.metrics = {"evaluation_status": "failed", "error": "Evaluation could not be completed right now. Please retry."}
                    await db.commit()
            except Exception as db_err:
                logger.exception("Failed to persist evaluation failure status to database: %s", db_err)

    @staticmethod
    async def start_async_evaluation(
        db: AsyncSession,
        session_id: uuid.UUID,
        user_id: uuid.UUID,
        force_recompute: bool = False,
    ) -> dict[str, Any]:
        """Initiates post-interview BARS evaluation through the durable PostgreSQL queue."""
        from app.services.evaluation_worker import EvaluationWorker

        return await EvaluationWorker.enqueue_session_evaluation(
            db=db,
            session_id=session_id,
            user_id=user_id,
            force_recompute=force_recompute,
        )

    @staticmethod
    async def get_session_status(
        db: AsyncSession,
        session_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> dict[str, Any]:
        """Returns the execution and evaluation status of an orchestrator session."""
        session = await OrchestratorService.get_session(db, session_id, user_id)
        if session is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview session not found")

        memory = session.working_memory or {}
        has_report = "evaluation_report" in memory and memory["evaluation_report"] is not None

        evaluation_status = session.evaluation_status or ("completed" if has_report else "idle")
        evaluation_error = session.evaluation_error

        # Timeout recovery: If left in 'processing' for > 180s without a report, mark failed to allow user retry
        if evaluation_status == "processing" and not has_report:
            now = datetime.now(timezone.utc)
            updated_at = session.updated_at
            if updated_at:
                if updated_at.tzinfo is None:
                    updated_at = updated_at.replace(tzinfo=timezone.utc)
                if (now - updated_at).total_seconds() > 180:
                    evaluation_status = "failed"
                    evaluation_error = "Evaluation task timed out or was interrupted. Click Retry to re-evaluate."
                    session.evaluation_status = "failed"
                    session.evaluation_error = evaluation_error
                    await db.commit()

        return {
            "session_id": session.id,
            "status": session.status,
            "evaluation_status": evaluation_status,
            "evaluation_error": evaluation_error,
            "has_report": has_report,
        }




