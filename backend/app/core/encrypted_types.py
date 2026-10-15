"""Tipos SQLAlchemy transparentes para persistir campos cifrados como texto."""
from sqlalchemy import Text
from sqlalchemy.types import TypeDecorator

from app.core.field_encryption import decrypt_json, decrypt_text, encrypt_json, encrypt_text


class EncryptedText(TypeDecorator):
    impl = Text
    cache_ok = True

    def __init__(self, associated_data: str):
        super().__init__()
        self.associated_data = associated_data

    def process_bind_param(self, value, dialect):
        return None if value is None else encrypt_text(value, self.associated_data)

    def process_result_value(self, value, dialect):
        return None if value is None else decrypt_text(value, self.associated_data)


class EncryptedJSON(TypeDecorator):
    """Armazena JSON, inclusive medidas numéricas, como ciphertext em TEXT."""
    impl = Text
    cache_ok = True

    def __init__(self, associated_data: str):
        super().__init__()
        self.associated_data = associated_data

    def process_bind_param(self, value, dialect):
        return None if value is None else encrypt_json(value, self.associated_data)

    def process_result_value(self, value, dialect):
        return None if value is None else decrypt_json(value, self.associated_data)
