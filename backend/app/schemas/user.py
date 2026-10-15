import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

AccessProfile = Literal["read_only", "operational", "operations_admin", "tablet_checkin"]


class UserCreate(BaseModel):
    """Owner-only creation of additional members (recepção, tablet, etc.)."""
    name: str = Field(..., min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(..., min_length=12, max_length=128)
    access_profile: AccessProfile = "read_only"


class UserAccessUpdate(BaseModel):
    access_profile: AccessProfile


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    email: EmailStr
    role: str
    access_profile: AccessProfile
    status: str
    created_at: datetime