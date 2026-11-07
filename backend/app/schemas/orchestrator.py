import hashlib
import uuid
from datetime import datetime, timezone, timedelta
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field, field_validator, model_validator


def compute_payload_hash(text: str) -> str:
    """Compute deterministic SHA-256 payload hash of canonical candidate input text."""
    normalized = " ".join(text.strip().split())
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


class TurnClassification(str, Enum):
    PROGRESS = "PROGRESS"
    ELABORATION = "ELABORATION"
    STUCK = "STUCK"
    DELIBERATION = "DELIBERATION"
    REPETITION = "REPETITION"


class EvidenceStatus(str, Enum):
    DEMONSTRATED_COMPETENCE = "DEMONSTRATED_COMPETENCE"
    WEAK_EVIDENCE = "WEAK_EVIDENCE"
    CONTRADICTORY_EVIDENCE = "CONTRADICTORY_EVIDENCE"
    INSUFFICIENT_COVERAGE = "INSUFFICIENT_COVERAGE"


class ConfidenceLevel(str, Enum):
    HIGH = "HIGH"
    MODERATE = "MODERATE"
    LOW = "LOW"
    NONE = "NONE"


class QualitativeRating(str, Enum):
    STAFF = "Staff"
    SENIOR = "Senior"
    MID_LEVEL = "Mid-Level"
    DEVELOPING = "Developing"
    UNASSESSED = "Unassessed"


class ApproachUpdate(BaseModel):
    approach_type: str = Field(default="optimal", description="brute_force | optimal | alternative")
    description: str = Field(default="", description="Summary of algorithmic or design approach")
    time_complexity: str | None = Field(default=None)
    space_complexity: str | None = Field(default=None)
    key_data_structures: list[str] = Field(default_factory=list)


class TurnDeltaMetadata(BaseModel):
    """Structured decision metadata extracted from candidate turn (not conversational chain-of-thought)."""
    technical_claims: list[str] = Field(default_factory=list, description="Verbatim or close technical claims made")
    identified_vulnerabilities: list[str] = Field(default_factory=list, description="Architectural risks or gaps")
    progress_classification: TurnClassification = Field(default=TurnClassification.PROGRESS)
    socratic_directive: str | None = Field(default=None, description="Suggested next line of inquiry")
    observed_competencies: list[str] = Field(default_factory=list)

    @field_validator("progress_classification", mode="before")
    @classmethod
    def normalize_turn_classification(cls, v: Any) -> TurnClassification:
        valid = {
            "PROGRESS": TurnClassification.PROGRESS,
            "ELABORATION": TurnClassification.ELABORATION,
            "STUCK": TurnClassification.STUCK,
            "DELIBERATION": TurnClassification.DELIBERATION,
            "REPETITION": TurnClassification.REPETITION,
        }
        if isinstance(v, TurnClassification):
            return v
        s = str(v).upper() if v else "PROGRESS"
        return valid.get(s, TurnClassification.PROGRESS)
    # Milestone 1: Structured Candidate Knowledge & Context Reconciliation
    approach_update: ApproachUpdate | None = Field(default=None)
    examples_provided: list[str] = Field(default_factory=list)
    edge_cases_covered: list[str] = Field(default_factory=list)
    candidate_correction: str | None = Field(default=None)
    candidate_requested_action: str | None = Field(default=None)
    repetition_noticed: bool = Field(default=False)


class WorkingMemory(BaseModel):
    """Canonical working state maintained across turns."""
    current_milestone: str = Field(default="problem_definition")
    milestone_history: list[str] = Field(default_factory=list)
    architectural_facts: list[str] = Field(default_factory=list)
    confirmed_vulnerabilities: list[str] = Field(default_factory=list)
    deliberation_seconds_spent: int = Field(default=0, ge=0)
    stagnation_turn_count: int = Field(default=0, ge=0)
    structured_knowledge: dict[str, Any] = Field(default_factory=dict)
    running_summary: list[str] = Field(default_factory=list)
    milestone_facts: dict[str, list[str]] = Field(default_factory=dict)


class IdempotencyRecord(BaseModel):
    """Metadata ledger entry for turn idempotency."""
    payload_hash: str
    turn_index: int
    committed: bool = False
    reserved_at: str
    committed_at: str | None = None
    response_summary: str | None = None


class OrchestratorSessionCreate(BaseModel):
    track: str = Field(default="System Design", max_length=100)
    title: str = Field(default="Technical Interview", max_length=255)
    problem_id: str | None = Field(default=None, max_length=100)
    target_duration_seconds: int = Field(default=1800, ge=300, le=7200)

    @field_validator("track")
    @classmethod
    def validate_active_track(cls, v: str) -> str:
        from app.orchestrator.milestones import normalize_track
        return normalize_track(v, allow_historical=False)


class OrchestratorSessionResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    track: str
    status: str
    evaluation_status: str = "idle"
    evaluation_error: str | None = None
    turn_index: int
    fencing_token: int
    in_flight_turn_id: str | None = None
    in_flight_expires_at: datetime | None = None
    working_memory: dict[str, Any]
    transcript: list[dict[str, Any]]
    target_duration_seconds: int = 1800
    scheduled_deadline: datetime | None = None
    remaining_seconds: int = 1800
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @model_validator(mode="before")
    @classmethod
    def populate_duration_fields(cls, data: Any) -> Any:
        if hasattr(data, "working_memory"):
            mem = data.working_memory or {}
            created_at = getattr(data, "created_at", None)
            target_duration = mem.get("target_duration_seconds", 1800)
            scheduled_dl = mem.get("scheduled_deadline")
            dl_dt = None
            if scheduled_dl:
                try:
                    dl_dt = datetime.fromisoformat(scheduled_dl)
                except Exception:
                    pass
            if dl_dt is None and created_at:
                if isinstance(created_at, datetime):
                    c_dt = created_at if created_at.tzinfo else created_at.replace(tzinfo=timezone.utc)
                    dl_dt = c_dt + timedelta(seconds=target_duration)
            now = datetime.now(timezone.utc)
            rem = max(0, int((dl_dt - now).total_seconds())) if dl_dt else target_duration
            setattr(data, "target_duration_seconds", target_duration)
            setattr(data, "scheduled_deadline", dl_dt)
            setattr(data, "remaining_seconds", rem)
        elif isinstance(data, dict):
            mem = data.get("working_memory") or {}
            created_at = data.get("created_at")
            target_duration = mem.get("target_duration_seconds", 1800)
            scheduled_dl = mem.get("scheduled_deadline")
            dl_dt = None
            if scheduled_dl:
                try:
                    dl_dt = datetime.fromisoformat(scheduled_dl)
                except Exception:
                    pass
            if dl_dt is None and created_at:
                if isinstance(created_at, datetime):
                    c_dt = created_at if created_at.tzinfo else created_at.replace(tzinfo=timezone.utc)
                    dl_dt = c_dt + timedelta(seconds=target_duration)
            now = datetime.now(timezone.utc)
            rem = max(0, int((dl_dt - now).total_seconds())) if dl_dt else target_duration
            data["target_duration_seconds"] = target_duration
            data["scheduled_deadline"] = dl_dt
            data["remaining_seconds"] = rem
        return data


class TurnReservationRequest(BaseModel):
    client_turn_id: str = Field(min_length=1, max_length=64, description="Client-generated unique turn key (UUID)")
    candidate_text: str = Field(min_length=1, max_length=20000)
    lease_duration_seconds: int = Field(default=45, ge=10, le=300)


class TurnReservationResponse(BaseModel):
    session_id: uuid.UUID
    turn_index: int
    fencing_token: int
    payload_hash: str
    status: str
    is_cached_replay: bool = False
    cached_response: dict[str, Any] | None = None
    expires_at: datetime | None = None


class TurnLeaseRenewalRequest(BaseModel):
    fencing_token: int
    extension_seconds: int = Field(default=30, ge=10, le=120)


class TurnCommitRequest(BaseModel):
    client_turn_id: str = Field(min_length=1, max_length=64)
    candidate_text: str = Field(min_length=1, max_length=20000)
    fencing_token: int
    assistant_response: str = Field(min_length=1, max_length=20000)
    delta_metadata: TurnDeltaMetadata | None = None


# ==============================================================================
# Stage 0.4: Post-Interview Qualitative BARS Evaluation Schemas
# ==============================================================================


class EvidenceClassification(str, Enum):
    DEMONSTRATED_COMPETENCE = "Demonstrated competence"
    WEAK_EVIDENCE = "Weak evidence"
    INSUFFICIENT_COVERAGE = "Insufficient coverage"
    CONTRADICTORY_EVIDENCE = "Contradictory evidence"


class CalibrationSignal(str, Enum):
    STRONG_EVIDENCE_COVERED = "Strong Evidence in Covered Areas"
    SOLID_EVIDENCE_SPECIFIC_GAPS = "Solid Evidence with Specific Gaps"
    MIXED_EVIDENCE = "Mixed Evidence with Critical Concerns"
    INCONCLUSIVE_COVERAGE = "Inconclusive Due to Limited Coverage"
    DEVELOPING = "Developing / Requires Fundamental Strengthening"


class InterviewCoverageSummary(BaseModel):
    total_competencies: int = 6
    demonstrated_count: int = 0
    weak_count: int = 0
    insufficient_coverage_count: int = 0
    contradictory_count: int = 0
    coverage_percentage: float = 0.0
    coverage_assessment: str = ""


class EvidenceQuote(BaseModel):
    turn_index: int
    speaker: str = "Candidate"
    quote: str
    relevance: str


class CompetencyEvaluation(BaseModel):
    competency_id: str
    competency_name: str
    evidence_classification: EvidenceClassification
    bars_level: int | None = Field(default=None, ge=1, le=4)
    bars_anchor: str
    behavioral_observation: str
    evidence_quotes: list[EvidenceQuote] = Field(default_factory=list)
    strengths: list[str] = Field(default_factory=list)
    gaps_or_limitations: list[str] = Field(default_factory=list)


class CommunicationDimension(BaseModel):
    dimension_id: str
    name: str
    rating: str = "Strong"  # Exemplary, Strong, Adequate, Developing
    observation: str
    evidence_quote: str | None = None


class SpeechTelemetry(BaseModel):
    total_words: int = 0
    candidate_speaking_minutes: float = 0.0
    estimated_wpm: int = 0
    filler_word_count: int = 0
    filler_words_breakdown: dict[str, int] = Field(default_factory=dict)


class CommunicationScorecard(BaseModel):
    overall_rating: str = "Strong"
    telemetry: SpeechTelemetry = Field(default_factory=SpeechTelemetry)
    dimensions: list[CommunicationDimension] = Field(default_factory=list)


class BarsEvaluationReport(BaseModel):
    session_id: uuid.UUID
    track: str = "System Design"
    title: str = "Technical Interview"
    calibration_signal: CalibrationSignal = Field(
        default=CalibrationSignal.STRONG_EVIDENCE_COVERED,
        description="Grounded calibration signal based strictly on covered competencies",
    )
    overall_hiring_recommendation: str  # Kept for backward compatibility
    coverage_summary: InterviewCoverageSummary = Field(
        default_factory=InterviewCoverageSummary,
        description="Explicit breakdown of demonstrated, weak, and unassessed competencies",
    )
    executive_summary: str
    competency_evaluations: list[CompetencyEvaluation]
    key_technical_strengths: list[str] = Field(default_factory=list)
    key_technical_weaknesses: list[str] = Field(default_factory=list)
    unresolved_architectural_areas: list[str] = Field(default_factory=list)
    communication_and_deliberation: str
    communication_scorecard: CommunicationScorecard | None = None
    actionable_growth_plan: list[str] = Field(default_factory=list)
    evaluation_limitations: list[str] = Field(default_factory=list)
    # True when the session was too short to assess; the report then carries no ratings at all.
    insufficient_data: bool = False
    insufficient_reason: str | None = None
    evaluated_at: str


class EvaluationStatusResponse(BaseModel):
    session_id: uuid.UUID
    status: str
    evaluation_status: str
    evaluation_error: str | None = None
    has_report: bool = False



