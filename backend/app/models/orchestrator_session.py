import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class OrchestratorSession(Base):
    __tablename__ = "orchestrator_sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False, default="Technical Interview")
    track: Mapped[str] = mapped_column(String(100), nullable=False, default="System Design")
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="in_progress")
    evaluation_status: Mapped[str] = mapped_column(String(30), nullable=False, default="idle")
    evaluation_error: Mapped[str | None] = mapped_column(String(500), nullable=True)
    turn_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    fencing_token: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    in_flight_turn_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    in_flight_payload_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    in_flight_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    idempotency_keys: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    working_memory: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    transcript: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

