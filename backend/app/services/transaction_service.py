"""Serviço de Transaction (fluxo de caixa) — isolado por tenant."""
import uuid
from datetime import date

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.product import Product
from app.models.student import Student
from app.models.transaction import Transaction


def list_transactions(db, tenant_id, *, kind=None, category=None, from_date=None, to_date=None, limit=500):
    stmt = select(Transaction).where(Transaction.tenant_id == tenant_id)
    if kind:
        stmt = stmt.where(Transaction.kind == kind)
    if category:
        stmt = stmt.where(Transaction.category == category)
    if from_date:
        stmt = stmt.where(Transaction.occurred_on >= from_date)
    if to_date:
        stmt = stmt.where(Transaction.occurred_on <= to_date)
    stmt = stmt.order_by(Transaction.occurred_on.desc()).limit(limit)
    return list(db.execute(stmt).scalars().all())


def create_transaction(db, tenant_id, payload):
    if payload.student_id is not None:
        student = db.execute(
            select(Student).where(Student.id == payload.student_id, Student.tenant_id == tenant_id)
        ).scalar_one_or_none()
        if student is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aluno não encontrado")
    if payload.product_id is not None:
        product = db.execute(
            select(Product).where(Product.id == payload.product_id, Product.tenant_id == tenant_id)
        ).scalar_one_or_none()
        if product is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produto não encontrado")
    tx = Transaction(
        tenant_id=tenant_id,
        kind=payload.kind,
        category=payload.category,
        amount=payload.amount,
        description=payload.description.strip(),
        occurred_on=payload.occurred_on,
        student_id=payload.student_id,
        product_id=payload.product_id,
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx


def update_transaction(db, tenant_id, tx_id, payload):
    tx = db.execute(
        select(Transaction).where(Transaction.id == tx_id, Transaction.tenant_id == tenant_id)
    ).scalar_one_or_none()
    if tx is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transação não encontrada")
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        if value is None:
            continue
        if field == "description" and isinstance(value, str):
            value = value.strip()
        setattr(tx, field, value)
    db.commit()
    db.refresh(tx)
    return tx


def delete_transaction(db, tenant_id, tx_id):
    tx = db.execute(
        select(Transaction).where(Transaction.id == tx_id, Transaction.tenant_id == tenant_id)
    ).scalar_one_or_none()
    if tx is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transação não encontrada")
    db.delete(tx)
    db.commit()


def summary_period(db, tenant_id, start, end):
    stmt = (
        select(Transaction.kind, func.coalesce(func.sum(Transaction.amount), 0))
        .where(
            Transaction.tenant_id == tenant_id,
            Transaction.occurred_on >= start,
            Transaction.occurred_on <= end,
        )
        .group_by(Transaction.kind)
    )
    rows = dict(db.execute(stmt).all())
    income = float(rows.get("income", 0) or 0)
    expense = float(rows.get("expense", 0) or 0)
    return {"income": income, "expense": expense, "balance": income - expense}
