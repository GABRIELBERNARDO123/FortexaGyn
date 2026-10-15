"""Modelo de Tenant (cliente) — pertence a um software."""
import uuid

from sqlalchemy import CheckConstraint, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import CreatedAtMixin, UUIDMixin


class Tenant(UUIDMixin, CreatedAtMixin, Base):
    __tablename__ = "tenants"
    __table_args__ = (
        CheckConstraint(
            "status IN ('active','suspended')",
            name="ck_tenants_status",
        ),
    )

    software_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("softwares.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, server_default="active")

    software: Mapped["Software"] = relationship(back_populates="tenants")  # noqa: F821
    users: Mapped[list["User"]] = relationship(  # noqa: F821
        back_populates="tenant",
        cascade="all, delete-orphan",
    )
    students: Mapped[list["Student"]] = relationship(  # noqa: F821
        back_populates="tenant",
        cascade="all, delete-orphan",
    )
    coaches: Mapped[list["Coach"]] = relationship(  # noqa: F821
        back_populates="tenant",
        cascade="all, delete-orphan",
    )
    products: Mapped[list["Product"]] = relationship(  # noqa: F821
        back_populates="tenant",
        cascade="all, delete-orphan",
    )