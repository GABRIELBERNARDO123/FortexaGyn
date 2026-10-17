import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class ReportCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    content: str = ""
    file_name: str | None = None
    file_type: str | None = None
    file_data: str | None = None

class ReportUpdate(BaseModel):
    title: str | None = Field(None, min_length=2, max_length=200)
    content: str | None = None
    file_name: str | None = None
    file_type: str | None = None
    file_data: str | None = None

class ReportOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    title: str
    content: str
    file_name: str | None = None
    file_type: str | None = None
    file_data: str | None = None
    created_at: datetime
    updated_at: datetime
