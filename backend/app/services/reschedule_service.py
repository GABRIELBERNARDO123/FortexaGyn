"""Serviço de Remarcação de treino."""
import uuid
from datetime import date, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import select

from app.models.reschedule import Reschedule
from app.models.student import Student


def create_reschedule(db, tenant_id, student_id, *, missed_date=None, new_date=None, new_time=None, reason="", user_id=None):
    """Cria ou atualiza remarcação. Se já existe pra missed_date, atualiza."""
    student = db.execute(
        select(Student).where(Student.id == student_id, Student.tenant_id == tenant_id)
    ).scalar_one_or_none()
    if student is None:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")

    today = date.today()
    missed_date = missed_date or today
    new_date = new_date or (missed_date + timedelta(days=1))
    new_time = new_time or student.workout_time

    # Se já existe remarcação desse aluno pra esse dia, atualiza
    existing = db.execute(
        select(Reschedule).where(
            Reschedule.tenant_id == tenant_id,
            Reschedule.student_id == student_id,
            Reschedule.missed_date == missed_date,
        )
    ).scalar_one_or_none()

    if existing:
        existing.new_date = new_date
        existing.new_time = new_time
        existing.reason = (reason or "").strip()
        existing.updated_at = datetime.now()
        db.commit()
        db.refresh(existing)
        return existing

    r = Reschedule(
        tenant_id=tenant_id,
        student_id=student_id,
        missed_date=missed_date,
        new_date=new_date,
        new_time=new_time,
        reason=(reason or "").strip(),
        created_by=user_id,
    )
    db.add(r)
    db.commit()
    db.refresh(r)
    return r


def update_reschedule(db, tenant_id, reschedule_id, *, new_date=None, new_time=None, reason=None):
    r = db.execute(
        select(Reschedule).where(Reschedule.id == reschedule_id, Reschedule.tenant_id == tenant_id)
    ).scalar_one_or_none()
    if r is None:
        raise HTTPException(status_code=404, detail="Remarcação não encontrada")
    if new_date is not None:
        r.new_date = new_date
    if new_time is not None:
        r.new_time = new_time
    if reason is not None:
        r.reason = reason.strip()
    r.updated_at = datetime.now()
    db.commit()
    db.refresh(r)
    return r


def delete_reschedule(db, tenant_id, reschedule_id):
    r = db.execute(
        select(Reschedule).where(Reschedule.id == reschedule_id, Reschedule.tenant_id == tenant_id)
    ).scalar_one_or_none()
    if r is None:
        raise HTTPException(status_code=404, detail="Remarcação não encontrada")
    db.delete(r)
    db.commit()


def list_reschedules(db, tenant_id, *, student_id=None, on_date=None, limit=200):
    stmt = select(Reschedule).where(Reschedule.tenant_id == tenant_id)
    if student_id is not None:
        stmt = stmt.where(Reschedule.student_id == student_id)
    if on_date is not None:
        stmt = stmt.where((Reschedule.missed_date == on_date) | (Reschedule.new_date == on_date))
    stmt = stmt.order_by(Reschedule.missed_date.desc()).limit(limit)
    return list(db.execute(stmt).scalars().all())


def reschedules_for_date(db, tenant_id, target_date):
    """Retorna mapa {student_id: {missed_date, new_date, new_time, reason}} das remarcações ATIVAS (new_date >= hoje)."""
    stmt = select(Reschedule).where(
        Reschedule.tenant_id == tenant_id,
        Reschedule.new_date >= target_date,
    )
    rows = list(db.execute(stmt).scalars().all())
    out = {}
    for r in rows:
        key = str(r.student_id)
        # Se já tem, mantém o mais recente
        if key not in out or r.updated_at > out[key]["updated_at"]:
            out[key] = {
                "id": str(r.id),
                "missed_date": r.missed_date.isoformat(),
                "new_date": r.new_date.isoformat(),
                "new_time": r.new_time,
                "reason": r.reason,
                "updated_at": r.updated_at,
            }
    return out


def missed_today(db, tenant_id, today):
    """Retorna mapa {student_id: reschedule_info} das remarcações com missed_date == hoje."""
    stmt = select(Reschedule).where(
        Reschedule.tenant_id == tenant_id,
        Reschedule.missed_date == today,
    )
    rows = list(db.execute(stmt).scalars().all())
    return {
        str(r.student_id): {
            "id": str(r.id),
            "missed_date": r.missed_date.isoformat(),
            "new_date": r.new_date.isoformat(),
            "new_time": r.new_time,
            "reason": r.reason,
        }
        for r in rows
    }
