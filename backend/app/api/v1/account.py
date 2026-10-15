"""Administrative account view/edit, restricted to its authenticated owner."""
from fastapi import APIRouter, Request
from sqlalchemy import select

from app.core.deps import CurrentTenant, DBSession, OwnerUser
from app.services.audit_service import add_event
from app.models.user import User
from app.schemas.account import AccountOut, AccountUpdate
from app.schemas.auth import UserPublic

router = APIRouter(prefix="/account", tags=["account"])


@router.get("", response_model=AccountOut)
def get_account(db: DBSession, tenant: CurrentTenant, owner: OwnerUser):
    users = db.execute(select(User).where(
        User.tenant_id == tenant.id, User.status == "active"
    )).scalars().all()
    account_owner = next(user for user in users if user.role == "owner")
    members = [user for user in users if user.role == "member"]
    return AccountOut(
        id=str(tenant.id), name=tenant.name, status=tenant.status,
        created_at=tenant.created_at, owner=UserPublic.model_validate(account_owner),
        additional_users=[UserPublic.model_validate(m) for m in members],
    )


@router.patch("", response_model=AccountOut)
def update_account(
    payload: AccountUpdate, db: DBSession, tenant: CurrentTenant, owner: OwnerUser, request: Request,
):
    tenant.name = payload.name.strip()
    add_event(db, request, "ACCOUNT_UPDATED", tenant_id=tenant.id, user_id=owner.id, resource="tenant", resource_id=tenant.id)
    db.commit()
    db.refresh(tenant)
    return get_account(db, tenant, owner)