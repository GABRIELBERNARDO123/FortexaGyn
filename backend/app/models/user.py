import uuid

from sqlalchemy import CheckConstraint, ForeignKey, Index, String, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import CreatedAtMixin, UpdatedAtMixin, UUIDMixin


class User(UUIDMixin, CreatedAtMixin, UpdatedAtMixin, Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("role IN ('owner','member')", name="ck_users_role"),
        CheckConstraint("status IN ('active','blocked')", name="ck_users_status"),
        CheckConstraint(
            "access_profile IN ('read_only','operational','operations_admin')",
            name="ck_users_access_profile",
        ),
        # Keep at most one owner (including a blocked owner) and one active member.
        Index("uq_users_one_owner_per_tenant", "tenant_id", unique=True,
              postgresql_where=text("role = 'owner'")),
        Index("uq_users_one_active_member_per_tenant", "tenant_id", unique=True,
              postgresql_where=text("role = 'member' AND status = 'active'")),
        Index("uq_users_email_lower_global", func.lower(text("email")), unique=True),
        UniqueConstraint("tenant_id", "email", name="uq_users_tenant_email"),
    )

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="RESTRICT"),
        nullable=False, index=True,
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    access_profile: Mapped[str] = mapped_column(
        String(32), nullable=False, server_default="read_only"
    )
    theme: Mapped[str | None] = mapped_column(String(20), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, server_default="active")

    tenant: Mapped["Tenant"] = relationship(back_populates="users")  # noqa: F821
    sessions: Mapped[list["Session"]] = relationship(  # noqa: F821
        back_populates="user", cascade="all, delete-orphan",
    )
