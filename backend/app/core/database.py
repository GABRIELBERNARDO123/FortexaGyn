from collections.abc import Generator

from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import get_settings

settings = get_settings()

engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,       # descarta conexões mortas
    pool_size=5,
    max_overflow=10,
    echo=False,               # True só para debug local
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
)


@event.listens_for(Session, "after_begin")
def _set_transaction_tenant(session: Session, transaction, connection) -> None:
    """Reaplica o tenant confiável em cada transação (inclusive após commit)."""
    tenant_id = session.info.get("tenant_id")
    if tenant_id is not None:
        connection.execute(
            text("SELECT set_config('app.tenant_id', :tenant_id, true)"),
            {"tenant_id": str(tenant_id)},
        )


def set_tenant_context(session: Session, tenant_id) -> None:
    """Set the trusted tenant on this Session and current transaction only."""
    if tenant_id is None:
        raise ValueError("tenant_id confiável é obrigatório")
    session.info["tenant_id"] = tenant_id
    session.execute(
        text("SELECT set_config('app.tenant_id', :tenant_id, true)"),
        {"tenant_id": str(tenant_id)},
    )


def set_login_email_context(session: Session, email: str) -> None:
    """Permit the exact global email lookup required before a login has a tenant."""
    session.execute(
        text("SELECT set_config('app.login_email', :email, true)"),
        {"email": email.strip().lower()},
    )


def set_session_token_context(session: Session, token_hash: str) -> None:
    """Scope pre-auth session lookup to the hash of the presented random token."""
    session.execute(
        text("SELECT set_config('app.session_token_hash', :token_hash, true)"),
        {"token_hash": token_hash},
    )


def set_session_user_context(session: Session, user_id) -> None:
    """Permit loading only the user attached to the validated session row."""
    session.execute(
        text("SELECT set_config('app.session_user_id', :user_id, true)"),
        {"user_id": str(user_id)},
    )


class Base(DeclarativeBase):
    """Base declarativa do SQLAlchemy 2.x."""
    pass


def get_db() -> Generator[Session, None, None]:
    """Dependência FastAPI: abre uma sessão por request e fecha no final."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
