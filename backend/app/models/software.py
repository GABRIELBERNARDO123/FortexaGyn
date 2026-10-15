from sqlalchemy import CheckConstraint, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import CreatedAtMixin, UUIDMixin


class Software(UUIDMixin, CreatedAtMixin, Base):
    __tablename__ = "softwares"
    __table_args__ = (
        CheckConstraint(
            "status IN ('active','inactive')",
            name="ck_softwares_status",
        ),
    )

    name: Mapped[str] = mapped_column(String(120), nullable=False)
    slug: Mapped[str] = mapped_column(String(60), nullable=False, unique=True, index=True)
    domain: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, server_default="active")

    tenants: Mapped[list["Tenant"]] = relationship(  # noqa: F821
        back_populates="software",
        cascade="save-update, merge",
    )
