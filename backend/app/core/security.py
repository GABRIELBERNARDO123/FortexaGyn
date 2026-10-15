"""Funções de segurança: hash de senha (Argon2id) e hash de tokens (SHA-256)."""
import hashlib
import secrets

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError

# Argon2id — configuração padrão recomendada pela OWASP (2024).
# time_cost=3, memory_cost=64MB, parallelism=4, hash_len=32, salt_len=16.
_ph = PasswordHasher(
    time_cost=3,
    memory_cost=65536,   # 64 MB
    parallelism=4,
    hash_len=32,
    salt_len=16,
)


def hash_password(password: str) -> str:
    """Gera hash Argon2id da senha. Nunca armazenar a senha em texto puro."""
    return _ph.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """Verifica se a senha bate com o hash. Retorna True/False."""
    try:
        return _ph.verify(password_hash, password)
    except (VerifyMismatchError, InvalidHashError):
        return False


def generate_token(nbytes: int = 32) -> str:
    """Gera token aleatório URL-safe. Usado para sessão e códigos de licença."""
    return secrets.token_urlsafe(nbytes)


def hash_token(token: str) -> str:
    """
    SHA-256 do token. Guardamos no banco só o hash — se o banco vazar,
    o atacante não consegue usar os tokens.
    """
    return hashlib.sha256(token.encode("utf-8")).hexdigest()