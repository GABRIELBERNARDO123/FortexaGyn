"""Serviço de Assessment (avaliação física) — isolado por tenant."""
import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.assessment import Assessment
from app.models.student import Student


def list_assessments(db, tenant_id, *, student_id=None):
    stmt = select(Assessment).where(Assessment.tenant_id == tenant_id)
    if student_id is not None:
        stmt = stmt.where(Assessment.student_id == student_id)
    stmt = stmt.order_by(Assessment.assessed_on.desc())
    return list(db.execute(stmt).scalars().all())


def get_assessment(db, tenant_id, assessment_id):
    a = db.execute(
        select(Assessment).where(Assessment.id == assessment_id, Assessment.tenant_id == tenant_id)
    ).scalar_one_or_none()
    if a is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Avaliação não encontrada")
    return a


def create_assessment(db, tenant_id, payload):
    student = db.execute(
        select(Student).where(Student.id == payload.student_id, Student.tenant_id == tenant_id)
    ).scalar_one_or_none()
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aluno não encontrado")
    a = Assessment(
        tenant_id=tenant_id,
        student_id=payload.student_id,
        assessed_on=payload.assessed_on,
        weight_kg=payload.weight_kg,
        height_cm=payload.height_cm,
        body_fat_pct=payload.body_fat_pct,
        muscle_mass_kg=payload.muscle_mass_kg,
        measures=payload.measures or {},
        notes=payload.notes.strip(),
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    return a


def update_assessment(db, tenant_id, assessment_id, payload):
    a = get_assessment(db, tenant_id, assessment_id)
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        if value is None:
            continue
        if field == "notes" and isinstance(value, str):
            value = value.strip()
        setattr(a, field, value)
    db.commit()
    db.refresh(a)
    return a


def delete_assessment(db, tenant_id, assessment_id):
    a = get_assessment(db, tenant_id, assessment_id)
    db.delete(a)
    db.commit()
