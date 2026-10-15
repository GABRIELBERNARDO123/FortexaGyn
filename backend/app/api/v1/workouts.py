"""Rotas de Workout (ficha de treino) — isoladas por tenant."""
import uuid

from fastapi import APIRouter, Query, status

from app.core.permissions import permission_dependency
from app.core.deps import CurrentTenant, DBSession
from app.schemas.workout import WorkoutCreate, WorkoutOut, WorkoutUpdate
from app.services import workout_service

router = APIRouter(prefix="/workouts", tags=["workouts"])


@router.get("", response_model=list[WorkoutOut], dependencies=[permission_dependency("workouts:read")])
def list_workouts(
    db: DBSession,
    tenant: CurrentTenant,
    student_id: uuid.UUID | None = Query(None),
):
    return workout_service.list_workouts(db, tenant.id, student_id=student_id)


@router.get("/{workout_id}", response_model=WorkoutOut, dependencies=[permission_dependency("workouts:read")])
def get_workout(workout_id: uuid.UUID, db: DBSession, tenant: CurrentTenant):
    return workout_service.get_workout(db, tenant.id, workout_id)


@router.post("", response_model=WorkoutOut, status_code=status.HTTP_201_CREATED, dependencies=[permission_dependency("workouts:create")])
def create_workout(payload: WorkoutCreate, db: DBSession, tenant: CurrentTenant):
    return workout_service.create_workout(db, tenant.id, payload)


@router.patch("/{workout_id}", response_model=WorkoutOut, dependencies=[permission_dependency("workouts:update")])
def update_workout(workout_id: uuid.UUID, payload: WorkoutUpdate, db: DBSession, tenant: CurrentTenant):
    return workout_service.update_workout(db, tenant.id, workout_id, payload)


@router.delete("/{workout_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[permission_dependency("workouts:delete")])
def delete_workout(workout_id: uuid.UUID, db: DBSession, tenant: CurrentTenant):
    workout_service.delete_workout(db, tenant.id, workout_id)
