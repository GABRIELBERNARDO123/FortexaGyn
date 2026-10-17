import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CheckinCreate(BaseModel):
    student_id: uuid.UUID
    note: str = Field("", max_length=500)


class CheckinOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    student_id: uuid.UUID
    checked_in_at: datetime
    note: str


class CheckinWithStudent(CheckinOut):
    student_name: str | None = None


class CheckinConfirmIn(BaseModel):
    """Body opcional do endpoint POST /checkins/confirm/{id}."""
    note: str = Field("", max_length=500)
