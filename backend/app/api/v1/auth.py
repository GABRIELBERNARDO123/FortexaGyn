"""Rotas HTTP de autenticação: /auth/signup, /verify-email, /login, /logout, /me."""
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Cookie, HTTPException, Request, Response, status

from app.core.config import get_settings
from app.core.deps import CurrentUser, DBSession, get_current_tenant
from app.core.security import generate_token, hash_token
from app.core.rate_limit import client_ip, limiter
from app.models.session import Session as SessionModel
from app.schemas.auth import (
    LoginRequest,
    MeResponse,
    MessageResponse,
    TenantPublic,
    UserPublic,
)
from app.schemas.signup import (
    SignupRequest,
    SignupResponse,
    VerifyEmailRequest,
)
from app.services import auth_service, signup_service

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


def _client_ip(request: Request) -> str | None:
    return client_ip(request) if request.client else None


def _set_session_cookie(response: Response, token: str) -> None:
    max_age = settings.SESSION_EXPIRE_HOURS * 3600
    response.set_cookie(
        key=settings.SESSION_COOKIE_NAME,
        value=token,
        max_age=max_age,
        httponly=True,
        secure=settings.SESSION_COOKIE_SECURE,
        samesite=settings.SESSION_COOKIE_SAMESITE,
        path="/"
    )


def _clear_session_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.SESSION_COOKIE_NAME,
        path="/",
        secure=settings.SESSION_COOKIE_SECURE,
        httponly=True,
        samesite=settings.SESSION_COOKIE_SAMESITE,
    )


def _create_session_for_user(
    db,
    user_id,
    *,
    ip: str | None,
    user_agent: str | None,
) -> str:
    raw_token = generate_token(32)
    expires = datetime.now(timezone.utc) + timedelta(hours=settings.SESSION_EXPIRE_HOURS)
    sess = SessionModel(
        user_id=user_id,
        session_token_hash=hash_token(raw_token),
        expires_at=expires,
        ip=ip,
        user_agent=user_agent,
    )
    db.add(sess)
    return raw_token


# =========================================================================
# POST /auth/signup
# =========================================================================

@router.post(
    "/signup",
    response_model=SignupResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
@limiter.limit("5/hour")
def signup(
    payload: SignupRequest,
    request: Request,
    db: DBSession,
) -> SignupResponse:
    if not settings.SIGNUP_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cadastro público desabilitado. Contate o administrador do FortexaGym.",
        )
    signup_service.start_signup(
        db,
        payload,
        ip=_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    return SignupResponse()


# =========================================================================
# POST /auth/verify-email
# =========================================================================

@router.post(
    "/verify-email",
    response_model=MeResponse,
    status_code=status.HTTP_201_CREATED,
)
@limiter.limit("10/hour")
def verify_email(
    payload: VerifyEmailRequest,
    request: Request,
    response: Response,
    db: DBSession,
) -> MeResponse:
    if not settings.SIGNUP_ENABLED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cadastro público desabilitado. Contate o administrador do FortexaGym.",
        )

    user, tenant = signup_service.verify_email(
        db,
        payload,
        ip=_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )

    token = _create_session_for_user(
        db,
        user.id,
        ip=_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    db.commit()
    db.refresh(user)
    db.refresh(tenant)

    _set_session_cookie(response, token)
    return MeResponse(
        user=UserPublic.model_validate(user),
        tenant=TenantPublic.model_validate(tenant),
    )


# =========================================================================
# POST /auth/login
# =========================================================================

@router.post("/login", response_model=MeResponse)
@limiter.limit("15/minute")
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: DBSession,
) -> MeResponse:
    user, tenant, token = auth_service.authenticate(
        db,
        payload.email,
        payload.password,
        ip=_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    _set_session_cookie(response, token)
    return MeResponse(
        user=UserPublic.model_validate(user),
        tenant=TenantPublic.model_validate(tenant),
    )


# =========================================================================
# POST /auth/logout
# =========================================================================

@router.post("/logout", response_model=MessageResponse)
def logout(
    request: Request,
    response: Response,
    db: DBSession,
    session_token: Annotated[
        str | None,
        Cookie(alias=settings.SESSION_COOKIE_NAME),
    ] = None,
) -> MessageResponse:
    auth_service.logout(
        db,
        session_token,
        ip=_client_ip(request),
        user_agent=request.headers.get("user-agent"),
    )
    _clear_session_cookie(response)
    return MessageResponse(message="Logout realizado com sucesso no FortexaGym")


# =========================================================================
# GET /auth/me
# =========================================================================

@router.get("/me", response_model=MeResponse)
def me(
    user: CurrentUser,
    db: DBSession,
) -> MeResponse:
    tenant = get_current_tenant(db, user)
    return MeResponse(
        user=UserPublic.model_validate(user),
        tenant=TenantPublic.model_validate(tenant),
    )