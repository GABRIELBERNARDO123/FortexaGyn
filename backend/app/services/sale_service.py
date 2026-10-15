"""Serviço de Sale (venda na loja) — isolado por tenant."""
import uuid
from datetime import date

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.product import Product
from app.models.student import Student
from app.models.sale import Sale, SaleItem
from app.models.transaction import Transaction


def list_sales(db, tenant_id, *, limit=200):
    stmt = (
        select(Sale)
        .options(selectinload(Sale.items))
        .where(Sale.tenant_id == tenant_id)
        .order_by(Sale.sold_at.desc())
        .limit(limit)
    )
    return list(db.execute(stmt).scalars().all())


def create_sale(db, tenant_id, payload):
    if not payload.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Venda sem itens")
    if payload.student_id is not None:
        student = db.execute(
            select(Student).where(Student.id == payload.student_id, Student.tenant_id == tenant_id)
        ).scalar_one_or_none()
        if student is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Aluno não encontrado")
    sale = Sale(tenant_id=tenant_id, student_id=payload.student_id, total=0, method=payload.method)
    db.add(sale)
    db.flush()
    total = 0.0
    for item in payload.items:
        product = db.execute(
            select(Product).where(Product.id == item.product_id, Product.tenant_id == tenant_id).with_for_update()
        ).scalar_one_or_none()
        if product is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Produto {item.product_id} não encontrado",
            )
        if product.stock < item.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Estoque insuficiente para {product.name}",
            )
        db.add(SaleItem(
            sale_id=sale.id,
            product_id=product.id,
            quantity=item.quantity,
            unit_price=float(product.price),
        ))
        product.stock -= item.quantity
        total += float(product.price) * item.quantity
    sale.total = total
    db.flush()
    tx = Transaction(
        tenant_id=tenant_id,
        kind="income",
        category="venda",
        amount=total,
        description=f"Venda #{str(sale.id)[:8]}",
        occurred_on=sale.sold_at.date() if sale.sold_at else date.today(),
        student_id=payload.student_id,
    )
    db.add(tx)
    db.commit()
    db.refresh(sale)
    return sale


def delete_sale(db, tenant_id, sale_id):
    sale = db.execute(
        select(Sale).where(Sale.id == sale_id, Sale.tenant_id == tenant_id)
    ).scalar_one_or_none()
    if sale is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Venda não encontrada")
    db.delete(sale)
    db.commit()
