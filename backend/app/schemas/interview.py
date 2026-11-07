import json
import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


class TranscriptLine(BaseModel):
    speaker: str = Field(default="Candidate", max_length=50)
    text: str = Field(default="", max_length=20000)
    time: str = Field(default="00:00", max_length=64)


class InterviewSessionCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    track: str | None = Field(default=None, max_length=100)

    @field_validator("track")
    @classmethod
    def validate_active_track(cls, v: str | None) -> str | None:
        if v:
            from app.orchestrator.milestones import normalize_track
            return normalize_track(v, allow_historical=False)
        return v
    question_count: int = Field(ge=0)
    duration_seconds: int = Field(ge=0)
    transcript: list[TranscriptLine] = Field(max_length=1000)
    overall_score: int | None = Field(default=None, ge=0, le=100)
    competency_level: str | None = Field(default=None, max_length=50)
    metrics: dict[str, Any] | None = None
    strengths: list[str] | None = None
    weaknesses: list[str] | None = None
    report: dict[str, Any] | None = None


class InterviewSessionResponse(BaseModel):
    id: uuid.UUID
    title: str
    track: str | None = None
    question_count: int
    duration_seconds: int
    transcript: list[TranscriptLine]
    overall_score: int | None = None
    competency_level: str | None = None
    metrics: dict[str, Any] | None = None
    strengths: list[str] | None = None
    weaknesses: list[str] | None = None
    report: dict[str, Any] | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserProfilePayload(BaseModel):
    @field_validator("resume_data", "jd_data", "jd_matches")
    @classmethod
    def blobs_not_huge(cls, v):
        # Stored per user and returned on every sync, so cap what one account can keep.
        if v is not None and len(json.dumps(v, default=str)) > 1_500_000:
            raise ValueError("payload is too large")
        return v

    resume_data: dict[str, Any] | None = None
    target_role: str | None = Field(default=None, max_length=255)
    target_company: str | None = Field(default=None, max_length=255)
    jd_data: dict[str, Any] | None = None
    jd_matches: list[Any] | None = None


class UserProfileResponse(BaseModel):
    user_id: uuid.UUID
    resume_data: dict[str, Any] | None = None
    target_role: str | None = None
    target_company: str | None = None
    jd_data: dict[str, Any] | None = None
    jd_matches: list[Any] | None = None
    updated_at: datetime

    model_config = {"from_attributes": True}


class ScoreTrendItem(BaseModel):
    date: str
    session_id: str
    title: str
    overall: int
    # Evaluation is qualitative now, so per-dimension numeric scores are not produced.
    technical: int | None = None
    behavioral: int | None = None
    communication: int | None = None


class SpeechAnalyticsSummary(BaseModel):
    wordsPerMinute: int | None = None
    fillerWords: dict[str, Any] | None = None
    pauseDuration: dict[str, Any] | None = None
    totalCandidateSpeakingMinutes: float = 0.0
    insights: list[str] = Field(default_factory=list)


class AnalyticsSummaryResponse(BaseModel):
    total_sessions: int
    evaluated_sessions: int
    average_score: int | None = None
    best_score: int | None = None
    total_duration_minutes: int
    score_trend: list[ScoreTrendItem] = Field(default_factory=list)
    speech_summary: SpeechAnalyticsSummary = Field(default_factory=SpeechAnalyticsSummary)
    common_strengths: list[str] = Field(default_factory=list)
    common_weaknesses: list[str] = Field(default_factory=list)
