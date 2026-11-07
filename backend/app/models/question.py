import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Question(Base):
    __tablename__ = "questions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    track: Mapped[str] = mapped_column(String(50), nullable=False, index=True)  # DSA, System Design, Core CS, Behavioral, Resume Technical
    topic: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    subtopic: Mapped[str | None] = mapped_column(String(100), nullable=True)
    difficulty: Mapped[str] = mapped_column(String(20), nullable=False, default="Medium")  # Easy, Medium, Hard, Staff
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    context_scenario: Mapped[str | None] = mapped_column(Text, nullable=True)
    expected_signals: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    follow_up_probes: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    provenance: Mapped[str] = mapped_column(String(30), nullable=False, default="curated_seed")  # curated_seed | dynamic_generated
    validation_status: Mapped[str] = mapped_column(String(30), nullable=False, default="verified")  # verified | candidate | archived
    quality_score: Mapped[float] = mapped_column(Float, nullable=False, default=1.0)
    semantic_fingerprint: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    question_family: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    source_attribution: Mapped[str | None] = mapped_column(String(255), nullable=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    metadata_json: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict, server_default="{}")
    usage_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

