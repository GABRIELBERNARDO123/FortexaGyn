import uuid
from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class PaymentCreate(BaseModel):
    student_id: uuid.UUID
    plan: Literal["Mensal", "Trimestral", "Semestral", "Anual"]
    amount: float = Field(ge=0, le=10_000_000, allow_inf_nan=False)
    paid_on: date
    method: Literal["pix", "dinheiro", "debito", "credito", "boleto", "transferencia"] = "pix"
    note: str = Field("", max_length=500)
    # se não informar period_start, usa paid_on
    period_start: date | None = None


class PaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    student_id: uuid.UUID
    plan: str
    amount: float
    paid_on: date
    period_start: date
    period_end: date
    method: str
    note: str
