"""Dependências FastAPI: sessão, usuário autenticado, tenant, autorização."""
from datetime import datetime, timezone
from typing import Annotated

from fastapi import Cookie, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import (
    get_db,
    set_session_token_context,
    set_session_user_context,
    set_tenant_context,
)
from app.core.security import hash_token
from app.models.session import Session as SessionModel
from app.models.tenant import Tenant
from app.models.user import User

settings = get_settings()


def _unauthorized(detail: str = "Não autenticado") -> HTTPException:
    """Erro 401 padronizado."""
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
    )


def get_current_user(
    db: Annotated[Session, Depends(get_db)],
    session_token: Annotated[str | None, Cookie(alias=settings.SESSION_COOKIE_NAME)] = None,
) -> User:
    """
    Lê o cookie de sessão, valida e retorna o User autenticado.

    Regras:
    - Cookie ausente → 401
    - Sessão não encontrada (hash não bate) → 401
    - Sessão revogada → 401
    - Sessão expirada → 401
    - Usuário não encontrado → 401
    - Usuário com status 'blocked' → 403
    - Tenant do usuário não encontrado → 401
    - Tenant com status 'suspended' → 403
    """
    if not session_token:
        raise _unauthorized("Sessão não encontrada")

    token_hash = hash_token(session_token)
    set_session_token_context(db, token_hash)

    sess = db.execute(
        select(SessionModel).where(SessionModel.session_token_hash == token_hash)
    ).scalar_one_or_none()

    if sess is None:
        raise _unauthorized("Sessão inválida")

    now = datetime.now(timezone.utc)

    if sess.revoked_at is not None:
        raise _unauthorized("Sessão revogada")

    if sess.expires_at <= now:
        raise _unauthorized("Sessão expirada")

    set_session_user_context(db, sess.user_id)
    user = db.get(User, sess.user_id)
    if user is None:
        raise _unauthorized("Usuário não encontrado")

    if user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário bloqueado",
        )

    set_tenant_context(db, user.tenant_id)
    tenant = db.get(Tenant, user.tenant_id)
    if tenant is None:
        raise _unauthorized("Tenant não encontrado")

    if tenant.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso suspenso. Contate o administrador.",
        )

    return user


def get_current_tenant(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
) -> Tenant:
    """
    Retorna o Tenant do usuário autenticado.
    O tenant_id vem SEMPRE do user (sessão), NUNCA do request.
    """
    tenant = db.get(Tenant, user.tenant_id)
    if tenant is None:
        raise _unauthorized("Tenant não encontrado")
    # Derivado do usuário autenticado e mantido no escopo da transação.
    set_tenant_context(db, user.tenant_id)
    return tenant


def require_owner(
    user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Garante que o usuário autenticado é 'owner'. Caso contrário, 403."""
    if user.role != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas o owner pode executar esta ação",
        )
    return user


# Aliases tipados para usar nas rotas — mais limpo e com autocomplete.
CurrentUser = Annotated[User, Depends(get_current_user)]
CurrentTenant = Annotated[Tenant, Depends(get_current_tenant)]
OwnerUser = Annotated[User, Depends(require_owner)]
DBSession = Annotated[Session, Depends(get_db)]
