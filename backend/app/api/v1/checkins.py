"""Rotas de Checkin — isoladas por tenant."""
import uuid
from datetime import date

from fastapi import APIRouter, Query, status

from app.core.permissions import permission_dependency
from app.core.deps import CurrentTenant, DBSession
from app.schemas.checkin import CheckinCreate, CheckinOut
from app.services import checkin_service

router = APIRouter(prefix="/checkins", tags=["checkins"])


@router.get("", response_model=list[CheckinOut], dependencies=[permission_dependency("checkins:read")])
def list_checkins(
    db: DBSession,
    tenant: CurrentTenant,
    student_id: uuid.UUID | None = Query(None),
    on_date: date | None = Query(None),
):
    return checkin_service.list_checkins(db, tenant.id, student_id=student_id, on_date=on_date)


@router.post("", response_model=CheckinOut, status_code=status.HTTP_201_CREATED, dependencies=[permission_dependency("checkins:create")])
def create_checkin(payload: CheckinCreate, db: DBSession, tenant: CurrentTenant):
    return checkin_service.create_checkin(db, tenant.id, payload)


@router.delete("/{checkin_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[permission_dependency("checkins:delete")])
def delete_checkin(checkin_id: uuid.UUID, db: DBSession, tenant: CurrentTenant):
    checkin_service.delete_checkin(db, tenant.id, checkin_id)


# =========================================================================
# TABLET — CHECK-IN DIÁRIO
# =========================================================================

@router.get("/today")
def list_today(db: DBSession, tenant: CurrentTenant):
    """
    Retorna alunos agendados pra HOJE + status de check-in.
    Usado pela tela de tablet da recepção.
    """
    return checkin_service.list_today_schedule(db, tenant.id)


@router.post("/confirm/{student_id}", response_model=CheckinOut, status_code=status.HTTP_201_CREATED)
def confirm_arrival(student_id: uuid.UUID, db: DBSession, tenant: CurrentTenant):
    """
    Confirma chegada do aluno (cria check-in).
    Se já existe check-in hoje, retorna o existente.
    """
    from app.services import checkin_service as cs
    from app.schemas.checkin import CheckinCreate as CC
    return cs.create_checkin(db, tenant.id, CC(student_id=student_id, note='Tablet recepção'))


# =========================================================================
# REMARCAÇÃO DE TREINO
# =========================================================================

from app.schemas.reschedule import RescheduleCreate, RescheduleUpdate, RescheduleOut
from app.services import reschedule_service
from app.core.deps import CurrentUser


@router.post("/reschedule/{student_id}", response_model=RescheduleOut, status_code=status.HTTP_201_CREATED)
def create_reschedule(
    student_id: uuid.UUID,
    payload: RescheduleCreate,
    db: DBSession,
    tenant: CurrentTenant,
    user: CurrentUser,
    _=permission_dependency("checkins:create"),
):
    """Cria remarcação pra um aluno. Default: hoje → amanhã, mesmo horário."""
    return reschedule_service.create_reschedule(
        db, tenant.id, student_id,
        missed_date=payload.missed_date,
        new_date=payload.new_date,
        new_time=payload.new_time,
        reason=payload.reason,
        user_id=user.id,
    )


@router.patch("/reschedule/{reschedule_id}", response_model=RescheduleOut)
def update_reschedule(
    reschedule_id: uuid.UUID,
    payload: RescheduleUpdate,
    db: DBSession,
    tenant: CurrentTenant,
    _=permission_dependency("checkins:create"),
):
    return reschedule_service.update_reschedule(
        db, tenant.id, reschedule_id,
        new_date=payload.new_date,
        new_time=payload.new_time,
        reason=payload.reason,
    )


@router.delete("/reschedule/{reschedule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_reschedule(
    reschedule_id: uuid.UUID,
    db: DBSession,
    tenant: CurrentTenant,
    _=permission_dependency("checkins:create"),
):
    reschedule_service.delete_reschedule(db, tenant.id, reschedule_id)


@router.get("/reschedules", response_model=list[RescheduleOut])
def list_reschedules(
    db: DBSession,
    tenant: CurrentTenant,
    student_id: uuid.UUID | None = Query(None),
    on_date: date | None = Query(None),
    _=permission_dependency("checkins:read"),
):
    return reschedule_service.list_reschedules(db, tenant.id, student_id=student_id, on_date=on_date)
