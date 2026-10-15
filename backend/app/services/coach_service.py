"""Serviço de Coach (professor/treinador) — isolado por tenant."""
import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.coach import Coach
from app.schemas.coach import CoachCreate, CoachUpdate


def list_coaches(db: Session, tenant_id: uuid.UUID) -> list[Coach]:
    """Lista todos os coaches do tenant autenticado."""
    stmt = select(Coach).where(Coach.tenant_id == tenant_id).order_by(Coach.name)
    return list(db.execute(stmt).scalars().all())


def get_coach(db: Session, tenant_id: uuid.UUID, coach_id: uuid.UUID) -> Coach:
    """Busca um coach por ID, validando que pertence ao tenant."""
    stmt = select(Coach).where(Coach.id == coach_id, Coach.tenant_id == tenant_id)
    coach = db.execute(stmt).scalar_one_or_none()
    if coach is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Professor não encontrado")
    return coach


def create_coach(db: Session, tenant_id: uuid.UUID, payload: CoachCreate) -> Coach:
    """Cria um novo coach no tenant."""
    coach = Coach(
        tenant_id=tenant_id,
        name=payload.name.strip(),
        specialty=payload.specialty.strip() if payload.specialty else None,
        phone=payload.phone.strip() if payload.phone else None,
        email=payload.email.lower().strip() if payload.email else None,
        status=payload.status,
    )
    db.add(coach)
    db.commit()
    db.refresh(coach)
    return coach


def update_coach(db: Session, tenant_id: uuid.UUID, coach_id: uuid.UUID, payload: CoachUpdate) -> Coach:
    """Atualiza um coach existente, validando tenant."""
    coach = get_coach(db, tenant_id, coach_id)
    data = payload.model_dump(exclude_unset=True)

    for field, value in data.items():
        if value is None:
            continue
        if field == "email" and isinstance(value, str):
            value = value.lower().strip()
        elif isinstance(value, str):
            value = value.strip()
        setattr(coach, field, value)

    db.commit()
    db.refresh(coach)
    return coach


def delete_coach(db: Session, tenant_id: uuid.UUID, coach_id: uuid.UUID) -> None:
    """Remove um coach. Alunos associados ficam com coach_id = NULL (SET NULL)."""
    coach = get_coach(db, tenant_id, coach_id)
    db.delete(coach)
    db.commit()