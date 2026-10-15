"""Rotas de Sale (venda na loja) — isoladas por tenant."""
import uuid

from fastapi import APIRouter, status

from app.core.permissions import permission_dependency
from app.core.deps import CurrentTenant, DBSession
from app.schemas.sale import SaleCreate, SaleOut
from app.services import sale_service

router = APIRouter(prefix="/sales", tags=["sales"])


@router.get("", response_model=list[SaleOut], dependencies=[permission_dependency("sales:read")])
def list_sales(db: DBSession, tenant: CurrentTenant):
    return sale_service.list_sales(db, tenant.id)


@router.post("", response_model=SaleOut, status_code=status.HTTP_201_CREATED, dependencies=[permission_dependency("sales:create")])
def create_sale(payload: SaleCreate, db: DBSession, tenant: CurrentTenant):
    return sale_service.create_sale(db, tenant.id, payload)


@router.delete("/{sale_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[permission_dependency("sales:delete")])
def delete_sale(sale_id: uuid.UUID, db: DBSession, tenant: CurrentTenant):
    sale_service.delete_sale(db, tenant.id, sale_id)
