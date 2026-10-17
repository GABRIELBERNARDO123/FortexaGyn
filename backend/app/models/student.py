"""Modelo de Student (aluno) — pertence a um tenant."""
import uuid
from datetime import date

from sqlalchemy import CheckConstraint, Date, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.encrypted_types import EncryptedText
from app.models.base import CreatedAtMixin, UpdatedAtMixin, UUIDMixin


class Student(UUIDMixin, CreatedAtMixin, UpdatedAtMixin, Base):
    __tablename__ = "students"
    __table_args__ = (
        CheckConstraint(
            "plan IN ('Mensal','Trimestral','Semestral','Anual')",
            name="ck_students_plan",
        ),
        CheckConstraint(
            "status IN ('active','inactive','desistente')",
            name="ck_students_status",
        ),
        CheckConstraint(
            "due_day BETWEEN 1 AND 31",
            name="ck_students_due_day",
        ),
        CheckConstraint(
            "price >= 0",
            name="ck_students_price",
        ),
    )

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    coach_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("coaches.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    name: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    phone: Mapped[str] = mapped_column(EncryptedText("students.phone"), nullable=False)
    phone_lookup_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    birth_date: Mapped[date] = mapped_column(Date, nullable=False)
    medical_record: Mapped[str] = mapped_column(EncryptedText("students.medical_record"), nullable=False, default="")
    workout_time: Mapped[str | None] = mapped_column(String(10), nullable=True)
    workout_days: Mapped[list] = mapped_column(JSONB, nullable=False, default=list)
    plan: Mapped[str] = mapped_column(String(20), nullable=False, default="Mensal")
    price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    due_day: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")

    tenant: Mapped["Tenant"] = relationship(back_populates="students")  # noqa: F821
    coach: Mapped["Coach | None"] = relationship(back_populates="students")  # noqa: F821
