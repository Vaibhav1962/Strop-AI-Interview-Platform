import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class UserProfile(Base):
    __tablename__ = "user_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    resume_data: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    target_role: Mapped[str | None] = mapped_column(String(255), nullable=True)
    target_company: Mapped[str | None] = mapped_column(String(255), nullable=True)
    jd_data: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    jd_matches: Mapped[list[Any] | None] = mapped_column(JSONB, nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
