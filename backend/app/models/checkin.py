"""Check-in de aluno na academia."""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Text, func, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import CreatedAtMixin, UUIDMixin


class Checkin(UUIDMixin, CreatedAtMixin, Base):
    __tablename__ = "checkins"
    __table_args__ = (
        UniqueConstraint("student_id", "checked_in_at", name="uq_checkin_student_time"),
    )

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    checked_in_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), index=True
    )
    note: Mapped[str] = mapped_column(Text, nullable=False, default="")

    student: Mapped["Student"] = relationship()  # noqa: F821