"""Serviço de Dashboard/Overview — agregações por tenant."""
import uuid
from datetime import date, timedelta

from sqlalchemy import case, extract, func, select

from app.models.checkin import Checkin
from app.models.payment import Payment
from app.models.product import Product
from app.models.sale import Sale, SaleItem
from app.models.student import Student
from app.models.transaction import Transaction
from app.models.workout import Workout


def _month_start(d):
    return d.replace(day=1)


def summary(db, tenant_id):
    today = date.today()
    month_start = _month_start(today)
    month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(days=1)

    total_students = db.execute(
        select(func.count()).select_from(Student).where(Student.tenant_id == tenant_id)
    ).scalar() or 0
    active_students = db.execute(
        select(func.count()).select_from(Student).where(
            Student.tenant_id == tenant_id, Student.status == "active"
        )
    ).scalar() or 0
    new_students_month = db.execute(
        select(func.count()).select_from(Student).where(
            Student.tenant_id == tenant_id,
            func.date(Student.created_at) >= month_start,
        )
    ).scalar() or 0

    fin = db.execute(
        select(Transaction.kind, func.coalesce(func.sum(Transaction.amount), 0))
        .where(
            Transaction.tenant_id == tenant_id,
            Transaction.occurred_on >= month_start,
            Transaction.occurred_on <= month_end,
        )
        .group_by(Transaction.kind)
    ).all()
    fin_map = dict(fin)
    income = float(fin_map.get("income", 0) or 0)
    expense = float(fin_map.get("expense", 0) or 0)

    by_cat = db.execute(
        select(Transaction.category, func.coalesce(func.sum(Transaction.amount), 0))
        .where(
            Transaction.tenant_id == tenant_id,
            Transaction.occurred_on >= month_start,
            Transaction.occurred_on <= month_end,
        )
        .group_by(Transaction.category)
    ).all()

    checkins_today = db.execute(
        select(func.count()).select_from(Checkin).where(
            Checkin.tenant_id == tenant_id, func.date(Checkin.checked_in_at) == today
        )
    ).scalar() or 0
    week_start = today - timedelta(days=7)
    checkins_week = db.execute(
        select(func.count()).select_from(Checkin).where(
            Checkin.tenant_id == tenant_id,
            func.date(Checkin.checked_in_at) >= week_start,
        )
    ).scalar() or 0
    checkins_month = db.execute(
        select(func.count()).select_from(Checkin).where(
            Checkin.tenant_id == tenant_id,
            func.date(Checkin.checked_in_at) >= month_start,
        )
    ).scalar() or 0

    birthdays = [
        {
            "id": str(r[0]),
            "name": r[1],
            "birth_date": r[2].isoformat(),
            "day": r[2].day,
            "phone": r[3],
        }
        for r in db.execute(
            select(Student.id, Student.name, Student.birth_date, Student.phone)
            .where(
                Student.tenant_id == tenant_id,
                extract("month", Student.birth_date) == today.month,
            )
            .order_by(extract("day", Student.birth_date))
        ).all()
    ]

    top_products = [
        {"name": r[0], "quantity": int(r[1])}
        for r in db.execute(
            select(Product.name, func.coalesce(func.sum(SaleItem.quantity), 0))
            .join(SaleItem, SaleItem.product_id == Product.id)
            .join(Sale, Sale.id == SaleItem.sale_id)
            .where(
                Sale.tenant_id == tenant_id,
                func.date(Sale.sold_at) >= month_start,
            )
            .group_by(Product.name)
            .order_by(func.sum(SaleItem.quantity).desc())
            .limit(5)
        ).all()
    ]

    daily = [
        {"date": r[0].isoformat(), "income": float(r[1]), "expense": float(r[2])}
        for r in db.execute(
            select(
                Transaction.occurred_on,
                func.coalesce(func.sum(case((Transaction.kind == "income", Transaction.amount), else_=0)), 0),
                func.coalesce(func.sum(case((Transaction.kind == "expense", Transaction.amount), else_=0)), 0),
            )
            .where(
                Transaction.tenant_id == tenant_id,
                Transaction.occurred_on >= today - timedelta(days=29),
            )
            .group_by(Transaction.occurred_on)
            .order_by(Transaction.occurred_on)
        ).all()
    ]

    workouts_count = db.execute(
        select(func.count()).select_from(Workout).where(Workout.tenant_id == tenant_id)
    ).scalar() or 0

    return {
        "students": {
            "total": int(total_students),
            "active": int(active_students),
            "new_this_month": int(new_students_month),
        },
        "finance": {
            "month": {
                "income": income,
                "expense": expense,
                "balance": income - expense,
                "by_category": {r[0]: float(r[1]) for r in by_cat},
            },
            "daily_30d": daily,
        },
        "checkins": {
            "today": int(checkins_today),
            "week": int(checkins_week),
            "month": int(checkins_month),
        },
        "birthdays_month": birthdays,
        "top_products": top_products,
        "workouts_count": int(workouts_count),
    }


def overview(db, tenant_id):
    today = date.today()
    checkins_today = db.execute(
        select(func.count()).select_from(Checkin).where(
            Checkin.tenant_id == tenant_id, func.date(Checkin.checked_in_at) == today
        )
    ).scalar() or 0
    horizon = today + timedelta(days=10)
    students = db.execute(
        select(Student.id, Student.name, Student.plan, Student.price, Student.due_day)
        .where(Student.tenant_id == tenant_id, Student.status == "active")
    ).all()
    upcoming = []
    for sid, name, plan, price, due_day in students:
        last_pay = db.execute(
            select(Payment.period_end)
            .where(Payment.tenant_id == tenant_id, Payment.student_id == sid)
            .order_by(Payment.period_end.desc())
            .limit(1)
        ).scalar_one_or_none()
        if last_pay is None:
            status_ = "sem_pagamento"; due = None
        elif last_pay < today:
            status_ = "vencido"; due = last_pay
        elif last_pay <= horizon:
            status_ = "a_vencer"; due = last_pay
        else:
            status_ = "em_dia"; due = last_pay
        if status_ in ("sem_pagamento", "vencido", "a_vencer"):
            upcoming.append({
                "id": str(sid),
                "name": name,
                "plan": plan,
                "price": float(price),
                "due_day": due_day,
                "period_end": due.isoformat() if due else None,
                "status": status_,
            })
    upcoming.sort(key=lambda x: x["period_end"] or "0000-00-00")
    return {
        "date": today.isoformat(),
        "checkins_today": int(checkins_today),
        "upcoming_payments": upcoming,
    }
