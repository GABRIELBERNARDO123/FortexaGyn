"""Schemas Pydantic para Student (aluno)."""
import uuid
from datetime import date, datetime

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

VALID_PLANS = ("Mensal", "Trimestral", "Semestral", "Anual")
VALID_STATUSES = ("active", "inactive")


class StudentCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    phone: str = Field(..., min_length=8, max_length=20)
    birth_date: date
    medical_record: str = Field("", max_length=5000)
    workout_time: str | None = Field(None, max_length=10)
    workout_days: list[Literal["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]] = Field(default_factory=list, max_length=7)
    plan: Literal["Mensal", "Trimestral", "Semestral", "Anual"] = "Mensal"
    price: float = Field(0, ge=0, le=10_000_000, allow_inf_nan=False)
    due_day: int = Field(10, ge=1, le=31)
    status: Literal["active", "inactive"] = "active"
    coach_id: uuid.UUID | None = None


class StudentUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=120)
    phone: str | None = Field(None, min_length=8, max_length=20)
    birth_date: date | None = None
    medical_record: str | None = Field(None, max_length=5000)
    workout_time: str | None = Field(None, max_length=10)
    workout_days: list[Literal["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]] | None = Field(None, max_length=7)
    plan: Literal["Mensal", "Trimestral", "Semestral", "Anual"] | None = None
    price: float | None = Field(None, ge=0, le=10_000_000, allow_inf_nan=False)
    due_day: int | None = Field(None, ge=1, le=31)
    status: Literal["active", "inactive"] | None = None
    coach_id: uuid.UUID | None = None


class StudentPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    phone: str
    birth_date: date
    medical_record: str | None
    workout_time: str | None
    workout_days: list[str]
    plan: str
    price: float
    due_day: int
    status: str
    coach_id: uuid.UUID | None
    created_at: datetime
