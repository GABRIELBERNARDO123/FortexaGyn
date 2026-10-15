"""Serviço de Product (loja) — isolado por tenant."""
import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.product import Product
from app.schemas.product import ProductCreate, ProductUpdate


def list_products(db: Session, tenant_id: uuid.UUID) -> list[Product]:
    stmt = select(Product).where(Product.tenant_id == tenant_id).order_by(Product.name)
    return list(db.execute(stmt).scalars().all())


def get_product(db: Session, tenant_id: uuid.UUID, product_id: uuid.UUID) -> Product:
    stmt = select(Product).where(Product.id == product_id, Product.tenant_id == tenant_id)
    product = db.execute(stmt).scalar_one_or_none()
    if product is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Produto não encontrado")
    return product


def create_product(db: Session, tenant_id: uuid.UUID, payload: ProductCreate) -> Product:
    product = Product(
        tenant_id=tenant_id,
        name=payload.name.strip(),
        category=payload.category,
        price=payload.price,
        cost=payload.cost,
        stock=payload.stock,
        min_stock=payload.min_stock,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


def update_product(db: Session, tenant_id: uuid.UUID, product_id: uuid.UUID, payload: ProductUpdate) -> Product:
    product = get_product(db, tenant_id, product_id)
    data = payload.model_dump(exclude_unset=True)

    for field, value in data.items():
        if value is None:
            continue
        if field == "name" and isinstance(value, str):
            value = value.strip()
        setattr(product, field, value)

    db.commit()
    db.refresh(product)
    return product


def delete_product(db: Session, tenant_id: uuid.UUID, product_id: uuid.UUID) -> None:
    product = get_product(db, tenant_id, product_id)
    db.delete(product)
    db.commit()