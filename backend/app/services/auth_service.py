"""Serviço de autenticação: ativação por licença, login, logout."""
from datetime import datetime, timedelta, timezone
import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import (
    set_login_email_context,
    set_session_token_context,
    set_session_user_context,
    set_tenant_context,
)
from app.core.security import generate_token, hash_password, hash_token, verify_password
from app.models.audit_log import AuditLog
from app.models.license import License
from app.models.session import Session as SessionModel
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.auth import ActivateRequest

settings = get_settings()


def _log_audit(
    db: Session,
    action: str,
    *,
    tenant_id=None,
    user_id=None,
    resource: str | None = None,
    resource_id=None,
    ip: str | None = None,
    user_agent: str | None = None,
) -> None:
    """Insere um registro em audit_logs. NÃO dá commit — quem chama faz."""
    if tenant_id is not None:
        set_tenant_context(db, tenant_id)
    db.add(
        AuditLog(
            tenant_id=tenant_id,
            user_id=user_id,
            action=action,
            resource=resource,
            resource_id=resource_id,
            # Do not retain network identifiers or user-agent strings in audit logs.
            ip=None,
            user_agent=None,
        )
    )


# =========================================================================
# ATIVAÇÃO POR LICENÇA
# =========================================================================

def activate_account(
    db: Session,
    payload: ActivateRequest,
    *,
    ip: str | None = None,
    user_agent: str | None = None,
) -> tuple[User, Tenant]:
    """
    Cria tenant + owner a partir de um código de licença.

    Regras:
    - Código deve existir (por hash)
    - Licença deve estar com status 'available'
    - Email não pode existir em outro tenant
    - Cria tenant, owner, atualiza licença, registra audit_log

    Retorna (user, tenant). Levanta HTTPException em qualquer falha.
    """
    # 1. Buscar licença pelo hash do código
    code_hash = hash_token(payload.activation_code.strip())
    lic = db.execute(
        select(License)
        .where(License.activation_code_hash == code_hash)
        .with_for_update()
    ).scalar_one_or_none()

    if lic is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Código de ativação inválido",
        )

    if lic.status != "available":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Licença indisponível",
        )

    # 2. Verificar se email já existe (globalmente, no MVP)
    email = payload.owner_email.lower()
    set_login_email_context(db, email)
    existing = db.execute(
        select(User).where(func.lower(User.email) == email)
    ).scalar_one_or_none()
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Este email já está cadastrado. Contate o suporte.",
        )

    # 3. Criar tenant
    tenant = Tenant(
        id=uuid.uuid4(),
        software_id=lic.software_id,
        name=payload.tenant_name.strip(),
    )
    set_tenant_context(db, tenant.id)
    db.add(tenant)
    db.flush()  # para ter tenant.id

    # 4. Criar owner
    owner = User(
        tenant_id=tenant.id,
        name=payload.owner_name.strip(),
        email=email,
        password_hash=hash_password(payload.owner_password),
        role="owner",
    )
    db.add(owner)
    db.flush()  # para ter owner.id

    # 5. Atualizar licença
    lic.status = "activated"
    lic.tenant_id = tenant.id
    lic.activated_at = datetime.now(timezone.utc)

    # 6. Audit log
    _log_audit(
        db,
        "ACTIVATE_LICENSE",
        tenant_id=tenant.id,
        user_id=owner.id,
        resource="license",
        resource_id=lic.id,
        ip=ip,
        user_agent=user_agent,
    )

    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Conflito ao criar conta. Verifique os dados.",
        ) from exc

    db.refresh(owner)
    db.refresh(tenant)
    return owner, tenant


# =========================================================================
# LOGIN
# =========================================================================

def authenticate(
    db: Session,
    email: str,
    password: str,
    *,
    ip: str | None = None,
    user_agent: str | None = None,
) -> tuple[User, Tenant, str]:
    """
    Valida credenciais, cria sessão e retorna (user, tenant, token_raw).

    O token_raw NUNCA é armazenado. Só o hash dele vai para o banco.
    Levanta HTTPException 401 em qualquer falha de credencial.
    """
    email_norm = email.lower().strip()
    set_login_email_context(db, email_norm)

    # 1. Buscar por email (case-insensitive)
    stmt = select(User).where(func.lower(User.email) == email_norm)
    users = db.execute(stmt).scalars().all()

    if not users:
        # Loga o evento sem endereço ou dado que permita enumerar a conta.
        _log_audit(db, "LOGIN_FAILED", ip=ip, user_agent=user_agent)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha inválidos",
        )

    if len(users) > 1:
        # Ambiguidade no MVP: mesmo email em múltiplos tenants
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email duplicado em múltiplos tenants. Contate o suporte.",
        )

    user = users[0]

    # 2. Verificar senha
    if not verify_password(password, user.password_hash):
        _log_audit(db, "LOGIN_FAILED", ip=ip, user_agent=user_agent)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou senha inválidos",
        )

    # 3. Verificar status do user
    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário bloqueado",
        )

    # 4. Verificar tenant
    set_tenant_context(db, user.tenant_id)
    tenant = db.get(Tenant, user.tenant_id)
    if tenant is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tenant não encontrado",
        )

    if tenant.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso suspenso. Contate o administrador.",
        )

    # 5. Criar sessão
    raw_token = generate_token(32)
    expires = datetime.now(timezone.utc) + timedelta(hours=settings.SESSION_EXPIRE_HOURS)

    sess = SessionModel(
        user_id=user.id,
        session_token_hash=hash_token(raw_token),
        expires_at=expires,
        ip=None,
        user_agent=None,
    )
    db.add(sess)

    # 6. Audit log
    _log_audit(
        db,
        "LOGIN",
        tenant_id=tenant.id,
        user_id=user.id,
        ip=ip,
        user_agent=user_agent,
    )

    db.commit()
    db.refresh(user)
    db.refresh(tenant)

    return user, tenant, raw_token


# =========================================================================
# LOGOUT
# =========================================================================

def logout(
    db: Session,
    session_token: str | None,
    *,
    ip: str | None = None,
    user_agent: str | None = None,
) -> None:
    """
    Revoga a sessão. Idempotente: se o token não existir, não faz nada.
    Não levanta erro se o token for inválido (já está "deslogado").
    """
    if not session_token:
        return

    token_hash = hash_token(session_token)
    set_session_token_context(db, token_hash)
    sess = db.execute(
        select(SessionModel).where(SessionModel.session_token_hash == token_hash)
    ).scalar_one_or_none()

    if sess is None or sess.revoked_at is not None:
        return

    sess.revoked_at = datetime.now(timezone.utc)
    set_session_user_context(db, sess.user_id)
    user = db.get(User, sess.user_id)

    _log_audit(
        db,
        "LOGOUT",
        tenant_id=user.tenant_id if user else None,
        user_id=sess.user_id,
        ip=ip,
        user_agent=user_agent,
    )

    db.commit()
