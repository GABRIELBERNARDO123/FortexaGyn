"""Serviço de Checkin — isolado por tenant."""
import uuid
from datetime import date, datetime

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.checkin import Checkin
from app.models.student import Student
from app.schemas.checkin import CheckinCreate


def list_checkins(db, tenant_id, *, student_id=None, on_date=None, limit=200):
    stmt = select(Checkin).where(Checkin.tenant_id == tenant_id)
    if student_id is not None:
        stmt = stmt.where(Checkin.student_id == student_id)
    if on_date is not None:
        stmt = stmt.where(func.date(Checkin.checked_in_at) == on_date)
    stmt = stmt.order_by(Checkin.checked_in_at.desc()).limit(limit)
    return list(db.execute(stmt).scalars().all())


def create_checkin(db, tenant_id, payload):
    student = db.execute(
        select(Student).where(Student.id == payload.student_id, Student.tenant_id == tenant_id)
    ).scalar_one_or_none()
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aluno não encontrado")
    checkin = Checkin(
        tenant_id=tenant_id,
        student_id=payload.student_id,
        checked_in_at=datetime.now(),
        note=payload.note.strip(),
    )
    db.add(checkin)
    db.commit()
    db.refresh(checkin)
    return checkin


def delete_checkin(db, tenant_id, checkin_id):
    checkin = db.execute(
        select(Checkin).where(Checkin.id == checkin_id, Checkin.tenant_id == tenant_id)
    ).scalar_one_or_none()
    if checkin is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Check-in não encontrado")
    db.delete(checkin)
    db.commit()


def count_today(db, tenant_id):
    today = date.today()
    stmt = select(func.count()).select_from(Checkin).where(
        Checkin.tenant_id == tenant_id,
        func.date(Checkin.checked_in_at) == today,
    )
    return int(db.execute(stmt).scalar() or 0)


# =========================================================================
# TABLET — CHECK-IN DIÁRIO
# =========================================================================

from datetime import date as _date
from sqlalchemy import and_, extract

def list_today_schedule(db, tenant_id):
    """Retorna TODOS os alunos ativos + check-in + remarcações."""
    from app.models.student import Student
    from app.models.coach import Coach
    from app.services.reschedule_service import missed_today, reschedules_for_date
    from sqlalchemy import select, func

    today = _date.today()
    weekday_map = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
    today_abbr = weekday_map[today.weekday()]

    students = db.execute(
        select(Student).where(
            Student.tenant_id == tenant_id,
            Student.status == 'active',
        ).order_by(Student.name)
    ).scalars().all()

    checkins_today = db.execute(
        select(Checkin).where(
            Checkin.tenant_id == tenant_id,
            func.date(Checkin.checked_in_at) == today,
        )
    ).scalars().all()
    checked_map = {str(c.student_id): c for c in checkins_today}

    coaches_map = {}
    coaches = db.execute(select(Coach).where(Coach.tenant_id == tenant_id)).scalars().all()
    for c in coaches:
        coaches_map[str(c.id)] = c.name

    missed = missed_today(db, tenant_id, today)               # remarcações com missed_date == hoje
    resched_map = reschedules_for_date(db, tenant_id, today)  # remarcações ativas (new_date >= hoje)

    def is_scheduled(s):
        return bool(s.workout_days and today_abbr in s.workout_days)

    all_students = []
    for s in students:
        key = str(s.id)
        c = checked_map.get(key)
        m = missed.get(key)
        r = resched_map.get(key)

        # Aluno está "presente" HOJE se foi remarcado para uma data >= hoje (mesmo que hoje seja o dia original)
        # Se missed_date == hoje, ele faltou hoje.
        faltou_hoje = m is not None
        # Se foi remarcado pra hoje (new_date == hoje) e não faltou hoje, considerar reagendado hoje
        remarcado_para_hoje = bool(r and r["new_date"] == today.isoformat() and r["missed_date"] != today.isoformat())

        all_students.append({
            "id": key,
            "name": s.name,
            "plan": s.plan,
            "workout_time": s.workout_time,
            "coach_name": coaches_map.get(str(s.coach_id), ''),
            "scheduled": is_scheduled(s),
            "checked_in": c is not None,
            "checked_in_at": c.checked_in_at.isoformat() if c else None,
            "missed_today": faltou_hoje,
            "missed_info": m,          # {missed_date, new_date, new_time, reason, id}
            "rescheduled_info": r,     # {missed_date, new_date, ...} ativo
            "rescheduled_to_today": remarcado_para_hoje,
        })

    all_students.sort(key=lambda x: (
        x['missed_today'],          # faltou hoje vai pro fim
        not x['scheduled'],
        x['workout_time'] or '99:99',
        x['name'].lower(),
    ))

    return {
        "date": today.isoformat(),
        "weekday": today_abbr,
        "total_scheduled": sum(1 for s in all_students if s['scheduled'] and not s['missed_today']),
        "total_checked_in": sum(1 for s in all_students if s['checked_in']),
        "total_missed": sum(1 for s in all_students if s['missed_today']),
        "total_students": len(all_students),
        "students": all_students,
    }
