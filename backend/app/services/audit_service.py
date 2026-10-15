"""Minimal security audit helpers. Never pass passwords, tokens or health content."""
from fastapi import Request
from app.core.database import set_tenant_context
from app.models.audit_log import AuditLog


def add_event(db, request: Request, action: str, *, tenant_id=None, user_id=None,
              resource: str | None = None, resource_id=None) -> None:
    if tenant_id is not None:
        set_tenant_context(db, tenant_id)
    db.add(AuditLog(
        tenant_id=tenant_id, user_id=user_id, action=action, resource=resource,
        resource_id=resource_id, ip=None, user_agent=None,
    ))
