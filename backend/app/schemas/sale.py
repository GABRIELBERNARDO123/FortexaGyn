import uuid
from datetime import datetime

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class SaleItemCreate(BaseModel):
    product_id: uuid.UUID
    quantity: int = Field(gt=0, le=999)


class SaleCreate(BaseModel):
    student_id: uuid.UUID | None = None
    method: Literal["pix", "dinheiro", "debito", "credito"] = "pix"
    items: list[SaleItemCreate] = Field(min_length=1, max_length=100)

    @field_validator("items")
    @classmethod
    def product_ids_must_be_unique(cls, items):
        ids = [item.product_id for item in items]
        if len(ids) != len(set(ids)):
            raise ValueError("Cada produto deve aparecer uma única vez")
        return items


class SaleItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    product_id: uuid.UUID
    quantity: int
    unit_price: float


class SaleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    student_id: uuid.UUID | None
    total: float
    method: str
    sold_at: datetime
    items: list[SaleItemOut]
