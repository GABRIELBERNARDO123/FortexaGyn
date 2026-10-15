"""Rotas CRUD de Products (loja) — isoladas por tenant."""
import uuid

from fastapi import APIRouter, status

from app.core.permissions import permission_dependency
from app.core.deps import CurrentTenant, DBSession
from app.schemas.product import ProductCreate, ProductPublic, ProductUpdate
from app.services import product_service

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=list[ProductPublic], dependencies=[permission_dependency("products:read")])
def list_products(db: DBSession, tenant: CurrentTenant) -> list[ProductPublic]:
    products = product_service.list_products(db, tenant.id)
    return [ProductPublic.model_validate(p) for p in products]


@router.post("", response_model=ProductPublic, status_code=status.HTTP_201_CREATED, dependencies=[permission_dependency("products:create")])
def create_product(payload: ProductCreate, db: DBSession, tenant: CurrentTenant) -> ProductPublic:
    product = product_service.create_product(db, tenant.id, payload)
    return ProductPublic.model_validate(product)


@router.get("/{product_id}", response_model=ProductPublic, dependencies=[permission_dependency("products:read")])
def get_product(product_id: uuid.UUID, db: DBSession, tenant: CurrentTenant) -> ProductPublic:
    product = product_service.get_product(db, tenant.id, product_id)
    return ProductPublic.model_validate(product)


@router.patch("/{product_id}", response_model=ProductPublic, dependencies=[permission_dependency("products:update")])
def update_product(product_id: uuid.UUID, payload: ProductUpdate, db: DBSession, tenant: CurrentTenant) -> ProductPublic:
    product = product_service.update_product(db, tenant.id, product_id, payload)
    return ProductPublic.model_validate(product)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[permission_dependency("products:delete")])
def delete_product(product_id: uuid.UUID, db: DBSession, tenant: CurrentTenant) -> None:
    product_service.delete_product(db, tenant.id, product_id)