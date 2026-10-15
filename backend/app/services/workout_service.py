"""Serviço de Workout (ficha de treino) — isolado por tenant."""
import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.coach import Coach
from app.models.student import Student
from app.models.workout import Workout, WorkoutExercise


def list_workouts(db, tenant_id, *, student_id=None):
    stmt = (
        select(Workout)
        .options(selectinload(Workout.exercises))
        .where(Workout.tenant_id == tenant_id)
        .order_by(Workout.valid_from.desc())
    )
    if student_id is not None:
        stmt = stmt.where(Workout.student_id == student_id)
    return list(db.execute(stmt).scalars().all())


def get_workout(db, tenant_id, workout_id):
    stmt = (
        select(Workout)
        .options(selectinload(Workout.exercises))
        .where(Workout.id == workout_id, Workout.tenant_id == tenant_id)
    )
    w = db.execute(stmt).scalar_one_or_none()
    if w is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ficha não encontrada")
    return w


def create_workout(db, tenant_id, payload):
    student = db.execute(
        select(Student).where(Student.id == payload.student_id, Student.tenant_id == tenant_id)
    ).scalar_one_or_none()
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aluno não encontrado")
    if payload.coach_id is not None:
        coach = db.execute(
            select(Coach).where(Coach.id == payload.coach_id, Coach.tenant_id == tenant_id)
        ).scalar_one_or_none()
        if coach is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Professor não encontrado")
    workout = Workout(
        tenant_id=tenant_id,
        student_id=payload.student_id,
        coach_id=payload.coach_id,
        name=payload.name.strip(),
        notes=payload.notes.strip(),
        valid_from=payload.valid_from,
        valid_until=payload.valid_until,
    )
    db.add(workout)
    db.flush()
    for i, ex in enumerate(payload.exercises):
        db.add(WorkoutExercise(
            workout_id=workout.id,
            position=ex.position or i,
            name=ex.name.strip(),
            sets=ex.sets,
            reps=ex.reps,
            load=ex.load,
            rest_seconds=ex.rest_seconds,
            notes=ex.notes.strip(),
        ))
    db.commit()
    db.refresh(workout)
    return workout


def update_workout(db, tenant_id, workout_id, payload):
    workout = get_workout(db, tenant_id, workout_id)
    data = payload.model_dump(exclude_unset=True)
    if data.get("coach_id") is not None:
        coach = db.execute(
            select(Coach).where(Coach.id == data["coach_id"], Coach.tenant_id == tenant_id)
        ).scalar_one_or_none()
        if coach is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Professor não encontrado")
    effective_start = data.get("valid_from", workout.valid_from)
    effective_end = data.get("valid_until", workout.valid_until)
    if effective_end is not None and effective_end < effective_start:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Período de treino inválido")
    for field, value in data.items():
        if value is None:
            continue
        if field in ("name", "notes") and isinstance(value, str):
            value = value.strip()
        setattr(workout, field, value)
    db.commit()
    db.refresh(workout)
    return workout


def delete_workout(db, tenant_id, workout_id):
    workout = get_workout(db, tenant_id, workout_id)
    db.delete(workout)
    db.commit()
