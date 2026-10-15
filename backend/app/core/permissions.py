"""Políticas centrais de acesso para usuários adicionais.

A autorização é calculada no servidor a partir do access_profile persistido.
O perfil informado pelo cliente nunca participa da decisão.
"""
from collections.abc import Callable

from fastapi import Depends, HTTPException, status

from app.core.deps import CurrentUser
from app.models.user import User

# Grants são ações explícitas; uma ação não implica as demais.
PROFILE_GRANTS: dict[str, frozenset[str]] = {
    "read_only": frozenset({
        "students:read", "coaches:read", "checkins:read", "workouts:read",
        "products:read",
    }),
    "tablet_checkin": frozenset({
        "checkins:read", "checkins:create", "students:read",
    }),
    "operational": frozenset({
        "students:read", "students:create",
        "coaches:read",
        "checkins:read", "checkins:create",
        "workouts:read", "workouts:create",
        "products:read", "products:create",
        "sales:read", "sales:create",
    }),
    "operations_admin": frozenset({
        "students:read", "students:create", "students:update", "students:delete",
        "students:health_read", "students:health_write",
        "coaches:read", "coaches:create", "coaches:update", "coaches:delete",
        "checkins:read", "checkins:create", "checkins:delete",
        "workouts:read", "workouts:create", "workouts:update", "workouts:delete",
        "assessments:read", "assessments:create", "assessments:update", "assessments:delete",
        "products:read", "products:create", "products:update", "products:delete",
        "sales:read", "sales:create", "sales:delete",
        "finance:read", "finance:create", "finance:update", "finance:delete",
        "reports:read", "reports:read_operational",
    }),
}


def is_allowed(user: User, permission: str) -> bool:
    if user.role == "owner":
        return True
    return permission in PROFILE_GRANTS.get(user.access_profile, frozenset())


def require_permission(permission: str) -> Callable:
    """FastAPI dependency para proteger uma ação individual de uma rota."""
    def check(user: CurrentUser) -> User:
        if is_allowed(user, permission):
            return user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permissão insuficiente para esta operação.",
        )

    return check


def permission_dependency(permission: str) -> Depends:
    return Depends(require_permission(permission))