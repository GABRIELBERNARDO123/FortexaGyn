from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.auth import UserPublic


class AccountUpdate(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)


class AccountOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    status: str
    created_at: datetime
    owner: UserPublic
    additional_users: list[UserPublic]