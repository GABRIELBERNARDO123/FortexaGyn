"""Rotas CRUD de Coaches (professores/treinadores) — isoladas por tenant."""
import uuid

from fastapi import APIRouter, status

from app.core.permissions import permission_dependency
from app.core.deps import CurrentTenant, DBSession
from app.schemas.coach import CoachCreate, CoachPublic, CoachUpdate
from app.services import coach_service

router = APIRouter(prefix="/coaches", tags=["coaches"])


@router.get("", response_model=list[CoachPublic], dependencies=[permission_dependency("coaches:read")])
def list_coaches(db: DBSession, tenant: CurrentTenant) -> list[CoachPublic]:
    """Lista todos os professores do tenant autenticado."""
    coaches = coach_service.list_coaches(db, tenant.id)
    return [CoachPublic.model_validate(c) for c in coaches]


@router.post("", response_model=CoachPublic, status_code=status.HTTP_201_CREATED, dependencies=[permission_dependency("coaches:create")])
def create_coach(payload: CoachCreate, db: DBSession, tenant: CurrentTenant) -> CoachPublic:
    """Cria um novo professor."""
    coach = coach_service.create_coach(db, tenant.id, payload)
    return CoachPublic.model_validate(coach)


@router.get("/{coach_id}", response_model=CoachPublic, dependencies=[permission_dependency("coaches:read")])
def get_coach(coach_id: uuid.UUID, db: DBSession, tenant: CurrentTenant) -> CoachPublic:
    coach = coach_service.get_coach(db, tenant.id, coach_id)
    return CoachPublic.model_validate(coach)


@router.patch("/{coach_id}", response_model=CoachPublic, dependencies=[permission_dependency("coaches:update")])
def update_coach(coach_id: uuid.UUID, payload: CoachUpdate, db: DBSession, tenant: CurrentTenant) -> CoachPublic:
    coach = coach_service.update_coach(db, tenant.id, coach_id, payload)
    return CoachPublic.model_validate(coach)


@router.delete("/{coach_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[permission_dependency("coaches:delete")])
def delete_coach(coach_id: uuid.UUID, db: DBSession, tenant: CurrentTenant) -> None:
    coach_service.delete_coach(db, tenant.id, coach_id)