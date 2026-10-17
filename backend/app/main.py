from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from urllib.parse import urlsplit
import logging

from app.api.v1.account import router as account_router
from app.api.v1.assessments import router as assessments_router
from app.api.v1.auth import router as auth_router
from app.api.v1.checkins import router as checkins_router
from app.api.v1.coaches import router as coaches_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.payments import router as payments_router
from app.api.v1.products import router as products_router
from app.api.v1.sales import router as sales_router
from app.api.v1.students import router as students_router
from app.api.v1.transactions import router as transactions_router
from app.api.v1.users import router as users_router
from app.api.v1.workouts import router as workouts_router
from app.api.v1.reports import router as reports_router
from app.core.config import get_settings
from app.core.rate_limit import limiter

settings = get_settings()
security_logger = logging.getLogger("security.http")

app = FastAPI(
    title=settings.APP_NAME,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url=None,
    openapi_url="/openapi.json" if settings.DEBUG else None,
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.exception_handler(RequestValidationError)
async def invalid_request(_request: Request, exc: RequestValidationError) -> JSONResponse:
    erros = []
    for error in exc.errors():
        campo = error["loc"][-1] if error["loc"] else "geral"
        tipo = error["type"]
        msg_original = error["msg"]

        if "email" in msg_original.lower() or "email" in tipo.lower():
            problema = "E-mail inválido"
            exemplo = "nome@academia.com.br"
        elif tipo == "missing":
            problema = "Campo obrigatório"
            exemplo = "Preencha este campo"
        elif tipo == "string_too_short":
            problema = "Texto muito curto"
            exemplo = "Use pelo menos 2 caracteres"
        elif tipo == "string_too_long":
            problema = "Texto muito longo"
            exemplo = "Reduza o tamanho do texto"
        elif tipo == "string_pattern_mismatch":
            problema = "Valor não permitido"
            exemplo = "Use 'active' ou 'inactive'"
        else:
            problema = msg_original
            exemplo = "Verifique o formato deste campo"

        erros.append({
            "campo": campo,
            "problema": problema,
            "exemplo": exemplo
        })

    return JSONResponse(
        status_code=400,
        content={
            "detail": "Verifique os campos abaixo",
            "erros": erros
        }
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Content-Type"],
)


@app.middleware("http")
async def security_headers_and_csrf(request: Request, call_next):
    response = None
    if request.method not in {"GET", "HEAD", "OPTIONS"} and settings.SESSION_COOKIE_NAME in request.cookies:
        origin = request.headers.get("origin")
        parsed = urlsplit(origin or "")
        allowed_origins = set(settings.cors_origins_list)
        request_origin = f"{request.url.scheme}://{request.headers.get('host', request.url.netloc)}"
        if not origin or not parsed.scheme or not parsed.netloc or (
            origin.rstrip("/") not in {value.rstrip("/") for value in allowed_origins}
            and origin.rstrip("/") != request_origin.rstrip("/")
        ):
            response = JSONResponse(status_code=403, content={"detail": "Origem da requisição não permitida"})

    if response is None:
        response = await call_next(request)
    if response.status_code in {400, 401, 403, 404, 429} or request.method == "DELETE":
        # Do not log query strings, bodies, cookies, email addresses or tokens.
        security_logger.info(
            "security_event method=%s path=%s status=%s",
            request.method,
            request.url.path,
            response.status_code,
        )
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    response.headers.setdefault("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'")
    if settings.SESSION_COOKIE_SECURE or settings.ENV.lower() == "production":
        response.headers.setdefault("Strict-Transport-Security", "max-age=31536000")
    if request.url.path.startswith(settings.API_V1_PREFIX):
        response.headers.setdefault("Cache-Control", "no-store")
    return response


@app.get(f"{settings.API_V1_PREFIX}/health")
async def health() -> dict:
    return {"status": "ok"}


# Rotas versionadas
app.include_router(auth_router, prefix=settings.API_V1_PREFIX)
app.include_router(account_router, prefix=settings.API_V1_PREFIX)
app.include_router(coaches_router, prefix=settings.API_V1_PREFIX)
app.include_router(products_router, prefix=settings.API_V1_PREFIX)
app.include_router(students_router, prefix=settings.API_V1_PREFIX)
app.include_router(users_router, prefix=settings.API_V1_PREFIX)
app.include_router(checkins_router, prefix=settings.API_V1_PREFIX)
app.include_router(transactions_router, prefix=settings.API_V1_PREFIX)
app.include_router(payments_router, prefix=settings.API_V1_PREFIX)
app.include_router(sales_router, prefix=settings.API_V1_PREFIX)
app.include_router(workouts_router, prefix=settings.API_V1_PREFIX)
app.include_router(assessments_router, prefix=settings.API_V1_PREFIX)
app.include_router(dashboard_router, prefix=settings.API_V1_PREFIX)
app.include_router(reports_router, prefix=settings.API_V1_PREFIX)
