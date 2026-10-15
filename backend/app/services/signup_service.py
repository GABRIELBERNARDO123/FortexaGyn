"""Serviço de cadastro com verificação de email.

Fluxo:
1. POST /auth/signup        → cria EmailVerification + envia código de 6 dígitos
2. POST /auth/verify-email  → valida código, cria Tenant + User (owner), loga

Regras de segurança:
- Email único globalmente (não pode existir User com mesmo email).
- Código é hash Argon2id no banco (nunca em texto puro).
- Expira em 15 minutos.
- Máximo 5 tentativas erradas antes de invalidar.
- Reenvio: se já existe verificação pendente para o email, sobrescreve.
"""
import logging
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import set_login_email_context, set_tenant_context
from app.core.security import hash_password, verify_password
from app.models.audit_log import AuditLog
from app.models.email_verification import EmailVerification
from app.models.software import Software
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.signup import SignupRequest, VerifyEmailRequest

logger = logging.getLogger(__name__)

CODE_TTL_MINUTES = 15
MAX_ATTEMPTS = 5


# =========================================================================
# ⚠️⚠️⚠️ ATENÇÃO — CÓDIGO FIXO EM DEV ⚠️⚠️⚠️
# =========================================================================
# ANTES DE FAZER DEPLOY EM PRODUÇÃO, REVERTER ESTA FUNÇÃO PARA:
#
#     def _generate_code() -> str:
#         """Gera código numérico de 6 dígitos."""
#         return f"{secrets.randbelow(1_000_000):06d}"
#
# =========================================================================
def _generate_code() -> str:
    """Gera código numérico de 6 dígitos. DEV_MODE: fixo em 000000."""
    from app.core.config import get_settings
    settings = get_settings()
    if settings.DEV_MODE:
        return "000000"
    return f"{secrets.randbelow(1_000_000):06d}"


def _log_audit(db: Session, action: str, **kwargs) -> None:
    kwargs.pop("ip", None)
    kwargs.pop("user_agent", None)
    if kwargs.get("tenant_id") is not None:
        set_tenant_context(db, kwargs["tenant_id"])
    db.add(AuditLog(action=action, **kwargs))


def start_signup(
    db: Session,
    payload: SignupRequest,
    *,
    ip: str | None = None,
    user_agent: str | None = None,
) -> None:
    """
    Inicia o cadastro: cria registro de verificação e envia código por email.
    Idempotente: se o email já tiver verificação pendente, sobrescreve.
    """
    email = payload.email.lower().strip()
    set_login_email_context(db, email)

    # 1. Email já cadastrado? (falha silenciosa — não revela existência)
    existing_user = db.execute(
        select(User).where(func.lower(User.email) == email)
    ).scalar_one_or_none()
    if existing_user is not None:
        _log_audit(
            db,
            "SIGNUP_DUPLICATE_EMAIL",
            ip=ip,
            user_agent=user_agent,
        )
        db.commit()
        return

    # 2. Remover verificações anteriores não consumidas do mesmo email
    db.execute(
        EmailVerification.__table__.delete().where(
            EmailVerification.email == email,
            EmailVerification.consumed_at.is_(None),
        )
    )

    # 3. Gerar código + hash + expiração
    code = _generate_code()
    code_hash = hash_password(code)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=CODE_TTL_MINUTES)

    # 4. Inserir registro
    verification = EmailVerification(
        email=email,
        code_hash=code_hash,
        tenant_name=payload.tenant_name.strip(),
        owner_name=payload.owner_name.strip(),
        password_hash=hash_password(payload.password),
        expires_at=expires_at,
    )
    db.add(verification)

    _log_audit(
        db,
        "SIGNUP_STARTED",
        resource="email_verification",
        ip=ip,
        user_agent=user_agent,
    )
    db.commit()

    # Nunca registrar endereços ou códigos de verificação: o código autentica a conta.

    # 6. Enviar email (import local para não quebrar se RESEND_API_KEY faltar)
    from app.services.email_service import send_verification_email

    try:
        send_verification_email(email, code)
    except Exception:
        # Não fazemos rollback: o código é válido, o usuário pode pedir reenvio.
        # E não queremos vazar (via HTTP) que o email falhou — evita enumeração.
        logger.error("[SIGNUP] Falha no envio de verificação de e-mail; conferir o provedor.")


def verify_email(
    db: Session,
    payload: VerifyEmailRequest,
    *,
    ip: str | None = None,
    user_agent: str | None = None,
) -> tuple[User, Tenant]:
    """
    Verifica o código e cria Tenant + User (owner).
    Retorna (user, tenant).
    Levanta HTTPException em qualquer falha.
    """
    email = payload.email.lower().strip()
    set_login_email_context(db, email)
    now = datetime.now(timezone.utc)

    # 1. Buscar verificação válida mais recente
    verification = db.execute(
        select(EmailVerification)
        .where(
            EmailVerification.email == email,
            EmailVerification.consumed_at.is_(None),
            EmailVerification.expires_at > now,
        )
        .order_by(EmailVerification.created_at.desc())
    ).scalars().first()

    if verification is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Código expirado ou inválido. Solicite um novo.",
        )

    # 2. Verificar código
    if not verify_password(payload.code, verification.code_hash):
        verification.attempts += 1
        if verification.attempts >= MAX_ATTEMPTS:
            verification.consumed_at = now
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Código inválido.",
        )

    # 3. Marcar como consumido
    verification.consumed_at = now

    # 4. Garantir que existe um Software (FortexaGym) — cria se não existir
    software = db.execute(
        select(Software).where(Software.slug == "fitpro")
    ).scalar_one_or_none()
    if software is None:
        software = Software(
            name="FortexaGym",
            slug="fitpro",
            domain="fitpro.com.br",
        )
        db.add(software)
        db.flush()

    # 5. Criar Tenant
    tenant = Tenant(
        id=uuid.uuid4(),
        software_id=software.id,
        name=verification.tenant_name,
    )
    set_tenant_context(db, tenant.id)
    db.add(tenant)
    db.flush()

    # 6. Criar User (owner)
    user = User(
        tenant_id=tenant.id,
        name=verification.owner_name,
        email=verification.email,
        password_hash=verification.password_hash,
        role="owner",
    )
    db.add(user)

    _log_audit(
        db,
        "SIGNUP_COMPLETED",
        tenant_id=tenant.id,
        user_id=user.id,
        resource="user",
        ip=ip,
        user_agent=user_agent,
    )

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Conflito ao criar conta. Tente novamente.",
        ) from exc

    db.refresh(user)
    db.refresh(tenant)
    return user, tenant
