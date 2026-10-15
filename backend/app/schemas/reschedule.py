import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class RescheduleCreate(BaseModel):
    missed_date: date | None = None        # default: hoje
    new_date: date | None = None           # default: amanhã
    new_time: str | None = Field(None, max_length=10)
    reason: str = Field("", max_length=1000)


class RescheduleUpdate(BaseModel):
    new_date: date | None = None
    new_time: str | None = Field(None, max_length=10)
    reason: str | None = Field(None, max_length=1000)


class RescheduleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    student_id: uuid.UUID
    missed_date: date
    new_date: date
    new_time: str | None
    reason: str
    created_at: datetime
    updated_at: datetime
