import uuid
from datetime import date

from pydantic import BaseModel, ConfigDict, Field


class AssessmentCreate(BaseModel):
    student_id: uuid.UUID
    assessed_on: date
    weight_kg: float | None = Field(None, ge=0, le=500, allow_inf_nan=False)
    height_cm: float | None = Field(None, ge=0, le=280, allow_inf_nan=False)
    body_fat_pct: float | None = Field(None, ge=0, le=100, allow_inf_nan=False)
    muscle_mass_kg: float | None = Field(None, ge=0, le=300, allow_inf_nan=False)
    measures: dict[str, float] = Field(default_factory=dict, max_length=40)
    notes: str = Field("", max_length=2000)
    attachment_name: str | None = None
    attachment_type: str | None = None
    attachment_data: str | None = None


class AssessmentUpdate(BaseModel):
    weight_kg: float | None = Field(None, ge=0, le=500, allow_inf_nan=False)
    height_cm: float | None = Field(None, ge=0, le=280, allow_inf_nan=False)
    body_fat_pct: float | None = Field(None, ge=0, le=100, allow_inf_nan=False)
    muscle_mass_kg: float | None = Field(None, ge=0, le=300, allow_inf_nan=False)
    measures: dict[str, float] | None = Field(None, max_length=40)
    notes: str | None = Field(None, max_length=2000)
    attachment_name: str | None = None
    attachment_type: str | None = None
    attachment_data: str | None = None


class AssessmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    student_id: uuid.UUID
    assessed_on: date
    weight_kg: float | None
    height_cm: float | None
    body_fat_pct: float | None
    muscle_mass_kg: float | None
    measures: dict
    notes: str
    attachment_name: str | None
    attachment_type: str | None
    attachment_data: str | None
