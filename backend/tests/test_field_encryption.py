import base64
from types import SimpleNamespace

import pytest

from app.core import field_encryption


@pytest.fixture(autouse=True)
def test_only_keys(monkeypatch):
    encryption_key = base64.b64encode(b"x" * 32).decode()
    lookup_key = base64.b64encode(b"y" * 32).decode()
    monkeypatch.setattr(field_encryption, "get_settings", lambda: SimpleNamespace(
        PII_ENCRYPTION_KEY=encryption_key,
        PII_LOOKUP_KEY=lookup_key,
    ))


def test_aes_gcm_round_trip_and_random_nonce():
    first = field_encryption.encrypt_text("11912345678", "students.phone")
    second = field_encryption.encrypt_text("11912345678", "students.phone")
    assert first.startswith("enc:v1:")
    assert first != second
    assert field_encryption.decrypt_text(first, "students.phone") == "11912345678"


def test_ciphertext_cannot_be_moved_between_fields():
    ciphertext = field_encryption.encrypt_text("informação privada", "students.medical_record")
    with pytest.raises(Exception):
        field_encryption.decrypt_text(ciphertext, "assessments.notes")


def test_phone_blind_index_is_stable_and_does_not_expose_phone():
    digest = field_encryption.phone_lookup_hash(" 11912345678 ")
    assert digest == field_encryption.phone_lookup_hash("11912345678")
    assert len(digest) == 64
    assert "11912345678" not in digest
