"""Avaliação física do aluno."""
import uuid
from datetime import date

from sqlalchemy import Date, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.core.encrypted_types import EncryptedJSON, EncryptedText
from app.models.base import CreatedAtMixin, UpdatedAtMixin, UUIDMixin


class Assessment(UUIDMixin, CreatedAtMixin, UpdatedAtMixin, Base):
    __tablename__ = "assessments"

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
    assessed_on: Mapped[date] = mapped_column(Date, nullable=False, index=True)

    weight_kg: Mapped[float | None] = mapped_column(EncryptedJSON("assessments.weight_kg"), nullable=True)
    height_cm: Mapped[float | None] = mapped_column(EncryptedJSON("assessments.height_cm"), nullable=True)
    body_fat_pct: Mapped[float | None] = mapped_column(EncryptedJSON("assessments.body_fat_pct"), nullable=True)
    muscle_mass_kg: Mapped[float | None] = mapped_column(EncryptedJSON("assessments.muscle_mass_kg"), nullable=True)

    # medidas em cm: peito, cintura, quadril, braço_d, braço_e, coxa_d, coxa_e, pant_d, pant_e
    measures: Mapped[dict] = mapped_column(EncryptedJSON("assessments.measures"), nullable=False, default=dict)

    notes: Mapped[str] = mapped_column(EncryptedText("assessments.notes"), nullable=False, default="")
    student: Mapped["Student"] = relationship()  # noqa: F821
