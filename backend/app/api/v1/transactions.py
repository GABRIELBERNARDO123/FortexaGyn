"""Rotas de Transaction (fluxo de caixa) — isoladas por tenant."""
import uuid
from datetime import date
from typing import Literal

from fastapi import APIRouter, Query, status

from app.core.deps import CurrentTenant, DBSession
from app.core.permissions import permission_dependency
from app.schemas.transaction import TransactionCreate, TransactionOut, TransactionUpdate
from app.services import transaction_service

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("", response_model=list[TransactionOut], dependencies=[permission_dependency("finance:read")])
def list_transactions(
    db: DBSession,
    tenant: CurrentTenant,
    kind: Literal["income", "expense"] | None = Query(None),
    category: Literal["mensalidade", "venda", "entrada_avulsa", "estoque", "despesa", "saida_avulsa"] | None = Query(None),
    from_date: date | None = Query(None),
    to_date: date | None = Query(None),
):
    if from_date and to_date and from_date > to_date:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Intervalo de datas inválido")
    return transaction_service.list_transactions(
        db, tenant.id, kind=kind, category=category, from_date=from_date, to_date=to_date
    )


@router.post("", response_model=TransactionOut, status_code=status.HTTP_201_CREATED, dependencies=[permission_dependency("finance:create")])
def create_transaction(payload: TransactionCreate, db: DBSession, tenant: CurrentTenant):
    return transaction_service.create_transaction(db, tenant.id, payload)


@router.get("/summary", dependencies=[permission_dependency("finance:read")])
def summary(
    db: DBSession,
    tenant: CurrentTenant,
    start: date = Query(...),
    end: date = Query(...),
):
    if start > end or (end - start).days > 366:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail="Intervalo de datas inválido")
    return transaction_service.summary_period(db, tenant.id, start, end)


@router.patch("/{tx_id}", response_model=TransactionOut, dependencies=[permission_dependency("finance:update")])
def update_transaction(tx_id: uuid.UUID, payload: TransactionUpdate, db: DBSession, tenant: CurrentTenant):
    return transaction_service.update_transaction(db, tenant.id, tx_id, payload)


@router.delete("/{tx_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[permission_dependency("finance:delete")])
def delete_transaction(tx_id: uuid.UUID, db: DBSession, tenant: CurrentTenant):
    transaction_service.delete_transaction(db, tenant.id, tx_id)


