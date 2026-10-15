"""Schemas Pydantic para Product (loja)."""
import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


VALID_CATEGORIES = ("Suplementos", "Bebidas", "Acessórios", "Vestuário", "Planos")


class ProductCreate(BaseModel):
    """Payload do POST /products."""
    name: str = Field(..., min_length=2, max_length=120)
    category: Literal["Suplementos", "Bebidas", "Acessórios", "Vestuário", "Planos"] = "Suplementos"
    price: float = Field(..., ge=0, le=10_000_000, allow_inf_nan=False)
    cost: float = Field(0, ge=0, le=10_000_000, allow_inf_nan=False)
    stock: int = Field(0, ge=0, le=10_000_000)
    min_stock: int = Field(3, ge=0, le=10_000_000)


class ProductUpdate(BaseModel):
    """Payload do PATCH /products/{id} — todos opcionais."""
    name: str | None = Field(None, min_length=2, max_length=120)
    category: Literal["Suplementos", "Bebidas", "Acessórios", "Vestuário", "Planos"] | None = None
    price: float | None = Field(None, ge=0, le=10_000_000, allow_inf_nan=False)
    cost: float | None = Field(None, ge=0, le=10_000_000, allow_inf_nan=False)
    stock: int | None = Field(None, ge=0, le=10_000_000)
    min_stock: int | None = Field(None, ge=0, le=10_000_000)


class ProductPublic(BaseModel):
    """Resposta padrão de produto."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    category: str
    price: float
    cost: float
    stock: int
    min_stock: int
    created_at: datetime
