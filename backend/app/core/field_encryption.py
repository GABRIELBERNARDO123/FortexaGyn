"""Criptografia autenticada de campos sensíveis, com chaves externas ao código."""
import base64
import hashlib
import hmac
import json
import secrets
from decimal import Decimal

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from app.core.config import get_settings

_PREFIX = "enc:v1:"


def _key(env_name: str) -> bytes:
    value = getattr(get_settings(), env_name)
    if not value:
        raise RuntimeError(f"{env_name} precisa ser configurada para dados sensíveis")
    try:
        key = base64.b64decode(value, validate=True)
    except (ValueError, TypeError) as exc:
        raise RuntimeError(f"{env_name} deve ser Base64 válido") from exc
    if len(key) != 32:
        raise RuntimeError(f"{env_name} deve decodificar para exatamente 32 bytes")
    return key


def encrypt_text(value: str, associated_data: str) -> str:
    nonce = secrets.token_bytes(12)
    ciphertext = AESGCM(_key("PII_ENCRYPTION_KEY")).encrypt(
        nonce, value.encode("utf-8"), associated_data.encode("utf-8")
    )
    encoded = base64.urlsafe_b64encode(nonce + ciphertext).decode("ascii")
    return _PREFIX + encoded


def decrypt_text(value: str, associated_data: str) -> str:
    if not value.startswith(_PREFIX):
        # Permite leitura durante rollout anterior à migration.
        return value
    payload = base64.urlsafe_b64decode(value[len(_PREFIX):].encode("ascii"))
    return AESGCM(_key("PII_ENCRYPTION_KEY")).decrypt(
        payload[:12], payload[12:], associated_data.encode("utf-8")
    ).decode("utf-8")


def encrypt_json(value: object, associated_data: str) -> str:
    def encode_decimal(item):
        if isinstance(item, Decimal):
            return float(item)
        raise TypeError(f"Tipo não serializável: {type(item).__name__}")

    raw = json.dumps(value, ensure_ascii=False, separators=(",", ":"), default=encode_decimal)
    return encrypt_text(raw, associated_data)


def decrypt_json(value: str, associated_data: str):
    return json.loads(decrypt_text(value, associated_data))


def phone_lookup_hash(value: str) -> str:
    """Índice cego estável; a chave é distinta da chave AES-GCM."""
    normalized = value.strip()
    return hmac.new(_key("PII_LOOKUP_KEY"), normalized.encode("utf-8"), hashlib.sha256).hexdigest()
