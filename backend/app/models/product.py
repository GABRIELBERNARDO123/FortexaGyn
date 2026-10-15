"""Modelo de Product (produto da loja) — pertence a um tenant."""
import uuid

from sqlalchemy import CheckConstraint, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import CreatedAtMixin, UpdatedAtMixin, UUIDMixin


class Product(UUIDMixin, CreatedAtMixin, UpdatedAtMixin, Base):
    __tablename__ = "products"
    __table_args__ = (
        CheckConstraint("price >= 0", name="ck_products_price"),
        CheckConstraint("cost >= 0", name="ck_products_cost"),
        CheckConstraint("stock >= 0", name="ck_products_stock"),
        CheckConstraint(
            "category IN ('Suplementos','Bebidas','Acessórios','Vestuário','Planos')",
            name="ck_products_category",
        ),
    )

    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tenants.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(30), nullable=False, default="Suplementos")
    price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    cost: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    stock: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    min_stock: Mapped[int] = mapped_column(Integer, nullable=False, default=3)

    tenant: Mapped["Tenant"] = relationship(back_populates="products")  # noqa: F821