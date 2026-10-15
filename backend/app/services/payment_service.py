"""Serviço de Payment (mensalidades) — isolado por tenant."""
import uuid
from datetime import date, timedelta
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.payment import Payment
from app.models.student import Student
from app.models.transaction import Transaction

PLAN_DAYS = {"Mensal": 30, "Trimestral": 90, "Semestral": 180, "Anual": 365}


def _calc_period_end(start, plan):
    return start + timedelta(days=PLAN_DAYS[plan])


def list_payments(db, tenant_id, *, student_id=None, limit=500):
    stmt = select(Payment).where(Payment.tenant_id == tenant_id)
    if student_id is not None:
        stmt = stmt.where(Payment.student_id == student_id)
    stmt = stmt.order_by(Payment.paid_on.desc()).limit(limit)
    return list(db.execute(stmt).scalars().all())


def create_payment(db, tenant_id, payload, *, user):
    student = db.execute(
        select(Student).where(Student.id == payload.student_id, Student.tenant_id == tenant_id)
    ).scalar_one_or_none()
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aluno não encontrado")
    custom_terms = payload.plan != student.plan or Decimal(str(payload.amount)) != Decimal(str(student.price))
    if custom_terms and user.role != "owner":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Somente o proprietário pode registrar condição de pagamento personalizada",
        )
    period_start = payload.period_start or payload.paid_on
    period_end = _calc_period_end(period_start, payload.plan)
    payment = Payment(
        tenant_id=tenant_id,
        student_id=payload.student_id,
        plan=payload.plan,
        amount=payload.amount,
        paid_on=payload.paid_on,
        period_start=period_start,
        period_end=period_end,
        method=payload.method,
        note=payload.note.strip(),
    )
    db.add(payment)
    db.flush()
    tx = Transaction(
        tenant_id=tenant_id,
        kind="income",
        category="mensalidade",
        amount=payload.amount,
        description=f"Mensalidade {payload.plan} - {student.name}",
        occurred_on=payload.paid_on,
        student_id=payload.student_id,
    )
    db.add(tx)
    db.commit()
    db.refresh(payment)
    return payment


def delete_payment(db, tenant_id, payment_id):
    payment = db.execute(
        select(Payment).where(Payment.id == payment_id, Payment.tenant_id == tenant_id)
    ).scalar_one_or_none()
    if payment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pagamento não encontrado")
    db.delete(payment)
    db.commit()


def next_due(db, tenant_id, student_id):
    student = db.execute(
        select(Student).where(Student.id == student_id, Student.tenant_id == tenant_id)
    ).scalar_one_or_none()
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aluno não encontrado")
    last = db.execute(
        select(Payment)
        .where(Payment.tenant_id == tenant_id, Payment.student_id == student_id)
        .order_by(Payment.period_end.desc())
        .limit(1)
    ).scalar_one_or_none()
    if last is None:
        return {"student_id": str(student_id), "next_due": None, "status": "sem_pagamento"}
    today = date.today()
    overdue = last.period_end < today
    return {
        "student_id": str(student_id),
        "last_paid_on": last.paid_on.isoformat(),
        "period_end": last.period_end.isoformat(),
        "next_due": last.period_end.isoformat(),
        "status": "vencido" if overdue else "em_dia",
        "days_until_due": (last.period_end - today).days,
    }
