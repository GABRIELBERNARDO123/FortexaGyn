"""Rotas de Payment (mensalidades) — isoladas por tenant."""
import uuid

from fastapi import APIRouter, Query, status

from app.core.permissions import permission_dependency
from app.core.deps import CurrentTenant, CurrentUser, DBSession
from app.schemas.payment import PaymentCreate, PaymentOut
from app.services import payment_service

router = APIRouter(prefix="/payments", tags=["payments"])


@router.get("", response_model=list[PaymentOut], dependencies=[permission_dependency("finance:read")])
def list_payments(
    db: DBSession,
    tenant: CurrentTenant,
    student_id: uuid.UUID | None = Query(None),
):
    return payment_service.list_payments(db, tenant.id, student_id=student_id)


@router.post("", response_model=PaymentOut, status_code=status.HTTP_201_CREATED, dependencies=[permission_dependency("finance:create")])
def create_payment(payload: PaymentCreate, db: DBSession, tenant: CurrentTenant, user: CurrentUser):
    return payment_service.create_payment(db, tenant.id, payload, user=user)


@router.delete("/{payment_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[permission_dependency("finance:delete")])
def delete_payment(payment_id: uuid.UUID, db: DBSession, tenant: CurrentTenant):
    payment_service.delete_payment(db, tenant.id, payment_id)


@router.get("/next-due/{student_id}", dependencies=[permission_dependency("finance:read")])
def next_due(student_id: uuid.UUID, db: DBSession, tenant: CurrentTenant):
    return payment_service.next_due(db, tenant.id, student_id)
