"""Rotas de Dashboard e Overview — agregações por tenant."""
from fastapi import APIRouter

from app.core.permissions import permission_dependency
from app.core.deps import CurrentTenant, DBSession
from app.services import dashboard_service

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard/summary", dependencies=[permission_dependency("reports:read_operational")])
def summary(db: DBSession, tenant: CurrentTenant):
    return dashboard_service.summary(db, tenant.id)


@router.get("/overview", dependencies=[permission_dependency("finance:read")])
def overview(db: DBSession, tenant: CurrentTenant):
    return dashboard_service.overview(db, tenant.id)
