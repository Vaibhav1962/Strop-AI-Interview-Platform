import io
import json
import os
import re
import uuid
import httpx
from datetime import datetime
from pypdf import PdfReader
from app.pdf_text import extract_pdf_text
from pydantic import BaseModel, Field, field_validator
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_optional_user
from app.api.rate_limiter import analysis_limiter, doc_limiter, limit_user, write_limiter
from app.config import get_settings
from app.database import get_db
from app.models.interview_session import InterviewSession
from app.models.orchestrator_session import OrchestratorSession
from app.models.user import User
from app.models.user_profile import UserProfile
from app.orchestrator.skill_extractor import extract_verified_skills
from app.schemas.interview import (
    AnalyticsSummaryResponse,
    ScoreTrendItem,
    InterviewSessionCreate,
    InterviewSessionResponse,
    UserProfilePayload,
    UserProfileResponse,
)

router = APIRouter(prefix="/interviews", tags=["interviews"])


@router.post(
    "",
    response_model=InterviewSessionResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(limit_user(write_limiter))],
)
async def create_interview_session(
    payload: InterviewSessionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> InterviewSession:
    session = InterviewSession(
        user_id=current_user.id,
        title=payload.title,
        track=payload.track,
        question_count=payload.question_count,
        duration_seconds=payload.duration_seconds,
        overall_score=payload.overall_score,
        competency_level=payload.competency_level,
        metrics=payload.metrics,
        strengths=payload.strengths,
        weaknesses=payload.weaknesses,
        report=payload.report,
        transcript=[line.model_dump() for line in payload.transcript],
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


@router.get("", response_model=list[InterviewSessionResponse])
async def list_interview_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[InterviewSession]:
    result = await db.execute(
        select(InterviewSession)
        .where(InterviewSession.user_id == current_user.id)
        .order_by(InterviewSession.created_at.desc())
    )
    return list(result.scalars().all())


@router.get("/analytics/summary", response_model=AnalyticsSummaryResponse)
async def get_analytics_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AnalyticsSummaryResponse:
    from collections import Counter

    from app.services.orchestrator_service import compute_session_duration_seconds

    # The orchestrator sessions are the source of truth: the legacy interview_sessions rows are not
    # reliably updated with the evaluation (score, duration, strengths), so read the report itself.
    result = await db.execute(
        select(OrchestratorSession)
        .where(OrchestratorSession.user_id == current_user.id)
        .order_by(OrchestratorSession.created_at.desc())
    )

    def candidate_turns(o: OrchestratorSession) -> int:
        return sum(1 for t in (o.transcript or []) if (t or {}).get("speaker") in ("You", "Candidate"))

    rows = []  # (session, report | None)
    for o in result.scalars().all():
        memory = o.working_memory or {}
        report = memory.get("evaluation_report") if isinstance(memory.get("evaluation_report"), dict) else None
        # Sessions that never got past the greeting are not practice.
        if report or candidate_turns(o) >= 2:
            rows.append((o, report))

    total_seconds = sum(compute_session_duration_seconds(o) for o, _ in rows)

    scored: list[tuple[OrchestratorSession, int]] = []
    for o, report in rows:
        cov = ((report or {}).get("coverage_summary") or {}).get("coverage_percentage")
        if isinstance(cov, (int, float)):
            scored.append((o, round(cov)))
    scores = [score for _, score in scored]

    trend = [
        ScoreTrendItem(
            date=o.created_at.isoformat(),
            session_id=str(o.id),
            title=o.title,
            overall=score,
        )
        for o, score in reversed(scored[:8])  # oldest to newest
    ]

    def top(field: str) -> list[str]:
        counts = Counter(
            item.strip()
            for _, report in rows
            for item in ((report or {}).get(field) or [])
            if isinstance(item, str) and item.strip()
        )
        return [text for text, _ in counts.most_common(5)]

    return AnalyticsSummaryResponse(
        total_sessions=len(rows),
        evaluated_sessions=len(scored),
        average_score=round(sum(scores) / len(scores)) if scores else None,
        best_score=max(scores) if scores else None,
        total_duration_minutes=round(total_seconds / 60),
        score_trend=trend,
        common_strengths=top("key_technical_strengths"),
        common_weaknesses=top("key_technical_weaknesses"),
    )


@router.get("/profile", response_model=UserProfileResponse)
async def get_user_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserProfileResponse:
    result = await db.execute(
        select(UserProfile).where(UserProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        profile = UserProfile(
            user_id=current_user.id,
            resume_data=None,
            target_role=None,
            target_company=None,
            jd_data=None,
            jd_matches=None,
        )
        db.add(profile)
        await db.commit()
        await db.refresh(profile)

    return profile


@router.post("/profile", response_model=UserProfileResponse, dependencies=[Depends(limit_user(write_limiter))])
async def save_user_profile(
    payload: UserProfilePayload,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserProfileResponse:
    result = await db.execute(
        select(UserProfile).where(UserProfile.user_id == current_user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        profile = UserProfile(
            user_id=current_user.id,
            resume_data=payload.resume_data,
            target_role=payload.target_role,
            target_company=payload.target_company,
            jd_data=payload.jd_data,
            jd_matches=payload.jd_matches,
        )
        db.add(profile)
    else:
        if payload.resume_data is not None:
            profile.resume_data = payload.resume_data
        if payload.target_role is not None:
            profile.target_role = payload.target_role
        if payload.target_company is not None:
            profile.target_company = payload.target_company
        if payload.jd_data is not None:
            profile.jd_data = payload.jd_data
        if payload.jd_matches is not None:
            profile.jd_matches = payload.jd_matches

    await db.commit()
    await db.refresh(profile)
    return profile


@router.get("/{session_id}", response_model=InterviewSessionResponse)
async def get_interview_session(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> InterviewSession:
    result = await db.execute(
        select(InterviewSession)
        .where(InterviewSession.id == session_id, InterviewSession.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview session not found.")
    return session


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(limit_user(write_limiter))])
async def delete_interview_session(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(
        select(InterviewSession)
        .where(InterviewSession.id == session_id, InterviewSession.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    orch_result = await db.execute(
        select(OrchestratorSession)
        .where(OrchestratorSession.id == session_id, OrchestratorSession.user_id == current_user.id)
    )
    orch_session = orch_result.scalar_one_or_none()
    if not session and not orch_session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interview session not found.")
    if session:
        await db.delete(session)
    if orch_session:
        await db.delete(orch_session)
    await db.commit()


@router.delete("", status_code=status.HTTP_200_OK, dependencies=[Depends(limit_user(write_limiter))])
async def reset_interview_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    await db.execute(
        delete(InterviewSession).where(InterviewSession.user_id == current_user.id)
    )
    await db.execute(
        delete(OrchestratorSession).where(OrchestratorSession.user_id == current_user.id)
    )
    await db.commit()
    return {"message": "All interview sessions have been reset for current user."}


MAX_DOC_BYTES = 5 * 1024 * 1024

def _require_small(value, limit: int, label: str) -> None:
    """Reject oversized JSON blobs a client could otherwise store or forward to a model."""
    if len(json.dumps(value, default=str)) > limit:
        raise ValueError(f"{label} is too large")


def _is_pdf(data: bytes) -> bool:
    return data[:5] == b"%PDF-"

  # 5 MB limit


@router.post("/extract-text")
async def extract_text_from_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    # 1. Rate limiting per user
    doc_limiter.check(str(current_user.id))

    # 2. Bounded streaming read (5MB + 1 byte probe)
    file_bytes = await file.read(MAX_DOC_BYTES + 1)
    if len(file_bytes) > MAX_DOC_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Document file exceeds maximum allowed size of 5 MB.",
        )

    filename = file.filename or "file.pdf"
    if (filename.lower().endswith(".pdf") or (file.content_type and "pdf" in file.content_type)) and not _is_pdf(file_bytes):
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="That file is not a valid PDF.")
    text = ""
    pages_count = 1

    if filename.lower().endswith(".pdf") or (file.content_type and "pdf" in file.content_type):
        try:
            pages_count = len(PdfReader(io.BytesIO(file_bytes)).pages)
            text = extract_pdf_text(file_bytes)
        except Exception as e:
            print(f"[ExtractText] PDF parse error: {e}")

    if not text:
        text = file_bytes.decode("utf-8", errors="ignore").strip()

    return {
        "filename": filename,
        "text": text,
        "pages": pages_count,
        "char_count": len(text),
    }


@router.post("/parse-resume")
async def parse_resume_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    """Structured resume parse: section segmentation + LLM extraction + cross-validation."""
    from app.resume_parser import parse_resume

    doc_limiter.check(str(current_user.id))
    file_bytes = await file.read(MAX_DOC_BYTES + 1)
    if len(file_bytes) > MAX_DOC_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Resume exceeds 5 MB.")

    filename = file.filename or "resume.pdf"
    if (filename.lower().endswith(".pdf") or (file.content_type and "pdf" in file.content_type)) and not _is_pdf(file_bytes):
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="That file is not a valid PDF.")
    text = ""
    if filename.lower().endswith(".pdf") or (file.content_type and "pdf" in file.content_type):
        try:
            text = extract_pdf_text(file_bytes)
        except Exception as e:
            print(f"[ParseResume] PDF parse error: {e}")
    if not text:
        text = file_bytes.decode("utf-8", errors="ignore").strip()
    if len(text) < 40:
        raise HTTPException(status_code=422, detail="Could not read any text from this resume.")

    result = await parse_resume(text)
    result.pop("_sections", None)
    result["raw_text"] = text
    result["filename"] = filename
    return result


class JdAnalyzeRequest(BaseModel):
    jd_text: str = Field(min_length=40, max_length=20000)
    resume: dict = Field(default_factory=dict)

    @field_validator("resume")
    @classmethod
    def resume_not_huge(cls, v: dict) -> dict:
        _require_small(v, 300_000, "resume")
        return v


@router.post("/analyze-jd")
async def analyze_job_description(
    payload: JdAnalyzeRequest,
    current_user: User = Depends(get_current_user),
):
    """Parses a job posting and matches it to the candidate's resume. LLM judgments are verified against the text."""
    from app.jd_analysis import analyze

    analysis_limiter.check(str(current_user.id))
    return await analyze(payload.jd_text, payload.resume)


@router.post("/analyze-resume")
async def analyze_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # 1. Rate limiting per user
    doc_limiter.check(str(current_user.id))

    # 2. Bounded streaming read (5MB + 1 byte probe)
    file_bytes = await file.read(MAX_DOC_BYTES + 1)
    if len(file_bytes) > MAX_DOC_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Resume file exceeds maximum allowed size of 5 MB.",
        )

    settings = get_settings()
    qwen_api_key = getattr(settings, "qwen_api_key", "") or os.environ.get("QWEN_API_KEY", "")

    filename = file.filename or "resume.pdf"
    if (filename.lower().endswith(".pdf") or (file.content_type and "pdf" in file.content_type)) and not _is_pdf(file_bytes):
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="That file is not a valid PDF.")
    resume_text = ""

    if filename.lower().endswith(".pdf") or (file.content_type and "pdf" in file.content_type):
        try:
            resume_text = extract_pdf_text(file_bytes)
        except Exception as e:
            print(f"[AnalyzeResume] PDF parse error: {e}")

    if not resume_text:
        resume_text = file_bytes.decode("utf-8", errors="ignore").strip()

    # Fetch past conversation and interview history to extract past struggle areas
    past_struggles_context = ""
    if current_user:
        try:
            result = await db.execute(
                select(InterviewSession)
                .where(InterviewSession.user_id == current_user.id)
                .order_by(InterviewSession.created_at.desc())
                .limit(5)
            )
            sessions = list(result.scalars().all())
            history_lines = []
            for s in sessions:
                for turn in (s.transcript or []):
                    spk = turn.get("speaker") or turn.get("role") or "User"
                    txt = turn.get("text") or turn.get("content") or ""
                    if txt:
                        history_lines.append(f"{spk}: {txt}")
            if history_lines:
                past_struggles_context = "\n".join(history_lines[-20:])
        except Exception as e:
            print(f"[AnalyzeResume] DB query error: {e}")

    # Honest fallback data when document is unreadable or LLM key is absent
    user_display_name = current_user.full_name if current_user else "Candidate"
    verified_resume_skills = extract_verified_skills(resume_text)
    fallback_data = {
        "name": user_display_name,
        "filename": filename,
        "summary": "Technical profile extracted from uploaded resume.",
        "skills": verified_resume_skills or ["Distributed Systems", "Software Architecture"],
        "projects": [],
        "past_struggles": [],
        "interview_topics": [
            "System Architecture: Walk through the core design decisions in your most recent system",
            "Distributed Systems: Tradeoffs between availability and consistency under partial network failure",
            "Reliability & Scale: Performance bottlenecks and caching strategies under peak load",
            "Engineering Tradeoffs: Architectural decisions and failure recovery mechanisms"
        ]
    }

    if not resume_text and not past_struggles_context:
        return fallback_data

    # Call LLM to extract candidate profile + calibrate interview questions
    if qwen_api_key:
        try:
            system_instruction = (
                "You are an elite technical interviewer and staff engineer calibrating a live technical interview. "
                "Analyze the candidate's resume text and past interview conversation history. "
                "CRITICAL EXTRACTION ACCURACY RULES:\n"
                "- Extract skills ONLY when explicitly substantiated as programming languages, frameworks, databases, or infrastructure tools.\n"
                "- NEVER extract common English verbs or idioms as technologies. Specifically: NEVER extract 'Go' or 'Golang' from phrases like 'go from 0 to 1', 'go to production', 'on the go', or 'ready to go'. Only extract 'Go' or 'Golang' if explicitly listed under a skills section or stated as a programming language.\n"
                "- DO NOT invent technologies not explicitly present in the candidate's resume text.\n"
                "Identify the candidate's name, technical summary, key skills, systems/projects built, "
                "and technical areas they previously struggled with or need deeper evaluation on. "
                "Generate 4 challenging interview topics grounded specifically in their resume projects and past struggle areas.\n"
                "Respond ONLY with a valid JSON object matching this structure:\n"
                "{\n"
                '  "name": "Candidate Full Name",\n'
                '  "summary": "Concise 2-sentence technical summary",\n'
                '  "skills": ["Skill1", "Skill2", "Skill3"],\n'
                '  "projects": [{"name": "Project Name", "description": "Architecture & scale details"}],\n'
                '  "past_struggles": ["Specific technical concept or tradeoff candidate struggled on in past interviews"],\n'
                '  "interview_topics": [\n'
                '    "Topic 1: Specific question probing Project 1 from resume",\n'
                '    "Topic 2: Deep dive probing past struggle area 1 to test their growth",\n'
                '    "Topic 3: High scale performance bottlenecks and failure recovery in Project 2",\n'
                '    "Topic 4: Distributed system tradeoffs and operational reliability"\n'
                '  ]\n'
                "}"
            )

            user_content = f"CANDIDATE RESUME TEXT:\n{resume_text[:4000]}\n\nPAST INTERVIEW TRANSCRIPT LOGS:\n{past_struggles_context or '(No past interview logs available — identify challenging areas directly from resume claims.)'}"

            async with httpx.AsyncClient(timeout=25.0) as client:
                res = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {qwen_api_key}",
                        "Content-Type": "application/json",
                        "HTTP-Referer": "https://interviewiq.app",
                        "X-Title": "Strop",
                    },
                    json={
                        "model": "qwen/qwen-2.5-72b-instruct",
                        "messages": [
                            {"role": "system", "content": system_instruction},
                            {"role": "user", "content": user_content},
                        ],
                        "max_tokens": 700,
                        "temperature": 0.3,
                    },
                )

                if res.status_code == 200:
                    raw = res.json()["choices"][0]["message"]["content"].strip()
                    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw).strip()
                    parsed = json.loads(cleaned)
                    parsed["filename"] = filename
                    
                    # Guardrail: Filter any false-positive hallucinated languages (e.g. Go, C, R)
                    if isinstance(parsed.get("skills"), list):
                        sanitized_skills = []
                        for s in parsed["skills"]:
                            s_clean = s.strip()
                            if s_clean.lower() in ("go", "golang", "c", "r"):
                                if any(s_clean.lower() == v.lower() for v in verified_resume_skills):
                                    sanitized_skills.append(s_clean)
                            else:
                                sanitized_skills.append(s_clean)
                        parsed["skills"] = sanitized_skills or verified_resume_skills
                    return parsed
        except Exception as e:
            print(f"[AnalyzeResume] LLM parsing error: {e}")

    return fallback_data
