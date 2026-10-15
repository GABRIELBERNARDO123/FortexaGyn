"""Serviço de Student (aluno) — isolado por tenant."""
import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.field_encryption import phone_lookup_hash
from app.models.coach import Coach
from app.models.student import Student
from app.schemas.student import StudentCreate, StudentUpdate


def list_students(
    db: Session,
    tenant_id: uuid.UUID,
    *,
    coach_id: uuid.UUID | None = None,
) -> list[Student]:
    """
    Lista alunos do tenant.
    Se `coach_id` for passado, filtra por professor.
    """
    stmt = select(Student).where(Student.tenant_id == tenant_id)
    if coach_id is not None:
        stmt = stmt.where(Student.coach_id == coach_id)
    stmt = stmt.order_by(Student.name)
    return list(db.execute(stmt).scalars().all())


def get_student(db: Session, tenant_id: uuid.UUID, student_id: uuid.UUID) -> Student:
    stmt = select(Student).where(Student.id == student_id, Student.tenant_id == tenant_id)
    student = db.execute(stmt).scalar_one_or_none()
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aluno não encontrado")
    return student


def create_student(db: Session, tenant_id: uuid.UUID, payload: StudentCreate) -> Student:
    if payload.coach_id is not None:
        coach = db.execute(
            select(Coach).where(Coach.id == payload.coach_id, Coach.tenant_id == tenant_id)
        ).scalar_one_or_none()
        if coach is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Professor não encontrado")
    student = Student(
        tenant_id=tenant_id,
        name=payload.name.strip(),
        phone=payload.phone.strip(),
        phone_lookup_hash=phone_lookup_hash(payload.phone),
        birth_date=payload.birth_date,
        medical_record=payload.medical_record.strip(),
        workout_time=payload.workout_time.strip() if payload.workout_time else None,
        workout_days=payload.workout_days,
        plan=payload.plan,
        price=payload.price,
        due_day=payload.due_day,
        status=payload.status,
        coach_id=payload.coach_id,
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


def update_student(db: Session, tenant_id: uuid.UUID, student_id: uuid.UUID, payload: StudentUpdate) -> Student:
    student = get_student(db, tenant_id, student_id)
    data = payload.model_dump(exclude_unset=True)
    if data.get("coach_id") is not None:
        coach = db.execute(
            select(Coach).where(Coach.id == data["coach_id"], Coach.tenant_id == tenant_id)
        ).scalar_one_or_none()
        if coach is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Professor não encontrado")
    for field, value in data.items():
        if value is None:
            continue
        if field in ("name", "phone", "medical_record", "workout_time") and isinstance(value, str):
            value = value.strip()
        if field == "phone":
            student.phone_lookup_hash = phone_lookup_hash(value)
        setattr(student, field, value)
    db.commit()
    db.refresh(student)
    return student


def delete_student(db: Session, tenant_id: uuid.UUID, student_id: uuid.UUID) -> None:
    student = get_student(db, tenant_id, student_id)
    db.delete(student)
    db.commit()
