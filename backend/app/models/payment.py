"""Pagamento de mensalidade/plano do aluno."""
import uuid
from datetime import date

from sqlalchemy import CheckConstraint, Date, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import CreatedAtMixin, UUIDMixin


class Payment(UUIDMixin, CreatedAtMixin, Base):
    __tablename__ = "payments"
    __table_args__ = (
        CheckConstraint(
            "plan IN ('Mensal','Trimestral','Semestral','Anual')",
            name="ck_payments_plan",
        ),
        CheckConstraint("amount >= 0", name="ck_payments_amount"),
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
    plan: Mapped[str] = mapped_column(String(20), nullable=False)
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    paid_on: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    method: Mapped[str] = mapped_column(String(20), nullable=False, default="pix")
    note: Mapped[str] = mapped_column(Text, nullable=False, default="")

    student: Mapped["Student"] = relationship()  # noqa: F821