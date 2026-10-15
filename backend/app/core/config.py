from functools import lru_cache
from ipaddress import ip_address

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import URL


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ==== APP ====
    APP_NAME: str = "SaaS Backend"
    ENV: str = "development"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"

    # ==== DATABASE ====
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    POSTGRES_HOST: str = "db"
    POSTGRES_PORT: int = 5432

    # ==== SECURITY ====
    SECRET_KEY: str = Field(min_length=32)
    # Chaves independentes, fornecidas somente pelo ambiente de execução.
    # Gere e armazene fora do repositório e da pasta pública.
    PII_ENCRYPTION_KEY: str = ""
    PII_LOOKUP_KEY: str = ""
    SESSION_COOKIE_NAME: str = "session_token"
    SESSION_EXPIRE_HOURS: int = 8
    SESSION_COOKIE_SECURE: bool | None = None
    SESSION_COOKIE_SAMESITE: str = "lax"

    # ==== CORS ====
    CORS_ORIGINS: str = ""
    TRUSTED_PROXY_IPS: str = ""

    # ==== EMAIL ====
    RESEND_API_KEY: str = ""
    RESEND_FROM_EMAIL: str = "onboarding@resend.dev"
    RESEND_FROM_NAME: str = "FortexaGym"

    # ==== FEATURES ====
    SIGNUP_ENABLED: bool = True
    DEV_MODE: bool = False

    @model_validator(mode="after")
    def validate_security_settings(self):
        try:
            for proxy_ip in self.trusted_proxy_ips:
                ip_address(proxy_ip)
        except ValueError as exc:
            raise ValueError("TRUSTED_PROXY_IPS contém endereço inválido") from exc
        if self.SESSION_COOKIE_SECURE is None:
            self.SESSION_COOKIE_SECURE = self.ENV.lower() in {"prod", "production"}
        if self.ENV.lower() in {"prod", "production"}:
            if self.DEBUG or self.DEV_MODE:
                raise ValueError("DEBUG e DEV_MODE devem estar desabilitados em produção")
            if not self.PII_ENCRYPTION_KEY or not self.PII_LOOKUP_KEY:
                raise ValueError("PII_ENCRYPTION_KEY e PII_LOOKUP_KEY são obrigatórias em produção")
            if not self.SESSION_COOKIE_SECURE:
                raise ValueError("SESSION_COOKIE_SECURE deve estar habilitado em produção")
            if self.SESSION_COOKIE_SAMESITE.lower() not in {"strict", "lax"}:
                raise ValueError("SESSION_COOKIE_SAMESITE inválido para produção")
            if not self.CORS_ORIGINS.strip() or any("*" in origin for origin in self.cors_origins_list):
                raise ValueError("CORS_ORIGINS deve listar origens HTTPS explícitas em produção")
            if any(not origin.startswith("https://") for origin in self.cors_origins_list):
                raise ValueError("CORS_ORIGINS de produção deve usar HTTPS")
        if self.SESSION_COOKIE_SAMESITE.lower() not in {"strict", "lax", "none"}:
            raise ValueError("SESSION_COOKIE_SAMESITE inválido")
        if self.SESSION_COOKIE_SAMESITE.lower() == "none" and not self.SESSION_COOKIE_SECURE:
            raise ValueError("SameSite=None exige cookie Secure")
        return self

    @property
    def database_url(self) -> URL:
        return URL.create(
            drivername="postgresql+psycopg",
            username=self.POSTGRES_USER,
            password=self.POSTGRES_PASSWORD,
            host=self.POSTGRES_HOST,
            port=self.POSTGRES_PORT,
            database=self.POSTGRES_DB,
        )

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def trusted_proxy_ips(self) -> set[str]:
        return {ip.strip() for ip in self.TRUSTED_PROXY_IPS.split(",") if ip.strip()}


@lru_cache
def get_settings() -> Settings:
    return Settings()
