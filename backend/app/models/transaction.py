"""Transação financeira (entrada ou saída) — base do fluxo de caixa."""
import uuid
from datetime import date

from sqlalchemy import CheckConstraint, Date, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import CreatedAtMixin, UUIDMixin


class Transaction(UUIDMixin, CreatedAtMixin, Base):
    __tablename__ = "transactions"
    __table_args__ = (
        CheckConstraint("kind IN ('income','expense')", name="ck_transactions_kind"),
        CheckConstraint(
            "category IN ('mensalidade','venda','entrada_avulsa','estoque','despesa','saida_avulsa')",
            name="ck_transactions_category",
        ),
        CheckConstraint("amount >= 0", name="ck_transactions_amount"),
    )

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    kind: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    occurred_on: Mapped[date] = mapped_column(Date, nullable=False, index=True)

    student_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("students.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    product_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="SET NULL"),
        nullable=True,
    )