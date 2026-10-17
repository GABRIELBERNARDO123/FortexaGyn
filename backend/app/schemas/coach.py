"""Schemas Pydantic para Coach (professor/treinador)."""
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class CoachCreate(BaseModel):
    """Payload do POST /coaches."""
    name: str = Field(..., min_length=2, max_length=120)
    specialty: str | None = Field(None, max_length=120)
    phone: str | None = Field(None, max_length=20)
    email: EmailStr
    status: str = Field("active", pattern=r"^(active|inactive)$")


class CoachUpdate(BaseModel):
    """Payload do PATCH /coaches/{id} — todos opcionais."""
    name: str | None = Field(None, min_length=2, max_length=120)
    specialty: str | None = Field(None, max_length=120)
    phone: str | None = Field(None, max_length=20)
    email: EmailStr | None = None
    status: str | None = Field(None, pattern=r"^(active|inactive)$")


class CoachPublic(BaseModel):
    """Resposta padrão de coach — nunca expõe nada interno."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    specialty: str | None
    phone: str | None
    email: str | None
    status: str
    created_at: datetime