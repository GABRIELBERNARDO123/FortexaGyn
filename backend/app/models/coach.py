"""Modelo de Coach (professor/treinador) — pertence a um tenant."""
import uuid

from sqlalchemy import CheckConstraint, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import CreatedAtMixin, UpdatedAtMixin, UUIDMixin


class Coach(UUIDMixin, CreatedAtMixin, UpdatedAtMixin, Base):
    __tablename__ = "coaches"
    __table_args__ = (
        CheckConstraint(
            "status IN ('active','inactive')",
            name="ck_coaches_status",
        ),
    )

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    specialty: Mapped[str | None] = mapped_column(String(120), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, server_default="active")

    tenant: Mapped["Tenant"] = relationship(back_populates="coaches")  # noqa: F821
    students: Mapped[list["Student"]] = relationship(  # noqa: F821
        back_populates="coach",
        cascade="save-update, merge",
    )