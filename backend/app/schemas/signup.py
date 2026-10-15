"""Schemas Pydantic para signup com verificação de email."""
from pydantic import BaseModel, EmailStr, Field


class SignupRequest(BaseModel):
    """Payload do POST /auth/signup — inicia o cadastro."""
    email: EmailStr
    owner_name: str = Field(..., min_length=2, max_length=120)
    tenant_name: str = Field(..., min_length=2, max_length=120)
    password: str = Field(..., min_length=8, max_length=128)


class VerifyEmailRequest(BaseModel):
    """Payload do POST /auth/verify-email — confirma o código."""
    email: EmailStr
    code: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")


class SignupResponse(BaseModel):
    """Resposta do POST /auth/signup — sempre genérica (não revela se email existe)."""
    message: str = "Se o email for válido, enviamos um código de verificação."