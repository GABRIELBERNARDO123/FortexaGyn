"""Schemas Pydantic para endpoints de autenticação."""
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# ===== ENTRADA =====

class ActivateRequest(BaseModel):
    """Payload do POST /auth/activate — cria tenant + owner a partir de licença."""
    activation_code: str = Field(..., min_length=10, max_length=200)
    tenant_name: str = Field(..., min_length=2, max_length=120)
    owner_name: str = Field(..., min_length=2, max_length=120)
    owner_email: EmailStr
    owner_password: str = Field(..., min_length=8, max_length=128)


class LoginRequest(BaseModel):
    """Payload do POST /auth/login."""
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)


# ===== SAÍDA =====

class TenantPublic(BaseModel):
    """Dados públicos do tenant (nunca expõe nada interno)."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    status: str


class UserPublic(BaseModel):
    """
    Dados públicos do usuário. NOTE: NÃO tem password_hash.
    Isso garante que a senha nunca vaze em nenhuma resposta.
    """
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tenant_id: uuid.UUID
    name: str
    email: EmailStr
    role: str
    access_profile: str
    status: str
    created_at: datetime


class MeResponse(BaseModel):
    """Resposta do GET /auth/me — usuário + tenant."""
    user: UserPublic
    tenant: TenantPublic


class ActivateResponse(BaseModel):
    """Resposta do POST /auth/activate."""
    user: UserPublic
    tenant: TenantPublic
    message: str = "Conta ativada com sucesso"


class MessageResponse(BaseModel):
    """Resposta genérica com mensagem (logout, etc.)."""
    message: str