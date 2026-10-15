import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import CreatedAtMixin, UUIDMixin


class License(UUIDMixin, CreatedAtMixin, Base):
    __tablename__ = "licenses"
    __table_args__ = (
        CheckConstraint(
            "status IN ('available','activated','suspended','cancelled')",
            name="ck_licenses_status",
        ),
    )

    software_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("softwares.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    # NULL antes da ativação, preenchido quando o tenant é criado.
    tenant_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    # Nunca armazenamos o código em texto puro. Só o hash Argon2id.
    activation_code_hash: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        unique=True,
    )
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        server_default="available",
    )
    activated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
