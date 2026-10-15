"""Encrypt phone and health/assessment data with application-managed AES-GCM."""
import json

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

from app.core.field_encryption import encrypt_json, encrypt_text, phone_lookup_hash

revision = "20261011_01"
down_revision = "20261010_02"
branch_labels = None
depends_on = None


def _require_keys() -> None:
    # Fail before DDL or data changes; the migration transaction also rolls back on error.
    phone_lookup_hash("migration-key-check")
    encrypt_text("migration-key-check", "migration.key-check")


def upgrade() -> None:
    _require_keys()
    bind = op.get_bind()

    seen_phones = set()
    for row in bind.execute(sa.text("SELECT tenant_id, phone FROM students ORDER BY id")):
        fingerprint = (row.tenant_id, phone_lookup_hash(row.phone))
        if fingerprint in seen_phones:
            raise RuntimeError(
                "Migration interrompida: telefones duplicados após remover espaços nas pontas. "
                "Resolva as duplicidades por tenant antes de tentar novamente."
            )
        seen_phones.add(fingerprint)

    op.drop_constraint("uq_students_tenant_phone", "students", type_="unique")
    op.add_column("students", sa.Column("phone_lookup_hash", sa.String(64), nullable=True))
    op.alter_column("students", "phone", type_=sa.Text(), postgresql_using="phone::text")

    assessments = (
        ("weight_kg", "numeric(6,2)"),
        ("height_cm", "numeric(6,2)"),
        ("body_fat_pct", "numeric(5,2)"),
        ("muscle_mass_kg", "numeric(6,2)"),
        ("measures", "jsonb"),
    )
    for column, old_type in assessments:
        op.alter_column(
            "assessments", column, type_=sa.Text(),
            postgresql_using=f"{column}::text",
        )

    for row in bind.execute(sa.text(
        "SELECT id, phone, medical_record FROM students ORDER BY id"
    )).mappings():
        bind.execute(sa.text(
            "UPDATE students SET phone=:phone, medical_record=:medical_record, "
            "phone_lookup_hash=:phone_hash WHERE id=:id"
        ), {
            "id": row["id"],
            "phone": encrypt_text(row["phone"], "students.phone"),
            "medical_record": encrypt_text(row["medical_record"], "students.medical_record"),
            "phone_hash": phone_lookup_hash(row["phone"]),
        })

    op.alter_column("students", "phone_lookup_hash", nullable=False)
    op.create_unique_constraint(
        "uq_students_tenant_phone_hash", "students", ["tenant_id", "phone_lookup_hash"]
    )

    query = sa.text(
        "SELECT id, weight_kg, height_cm, body_fat_pct, muscle_mass_kg, measures, notes "
        "FROM assessments ORDER BY id"
    )
    for row in bind.execute(query).mappings():
        values = {"id": row["id"]}
        for field in ("weight_kg", "height_cm", "body_fat_pct", "muscle_mass_kg"):
            values[field] = None if row[field] is None else encrypt_json(float(row[field]), f"assessments.{field}")
        measures = row["measures"]
        if isinstance(measures, str):
            measures = json.loads(measures)
        values["measures"] = encrypt_json(measures, "assessments.measures")
        values["notes"] = encrypt_text(row["notes"], "assessments.notes")
        bind.execute(sa.text(
            "UPDATE assessments SET weight_kg=:weight_kg, height_cm=:height_cm, "
            "body_fat_pct=:body_fat_pct, muscle_mass_kg=:muscle_mass_kg, "
            "measures=:measures, notes=:notes WHERE id=:id"
        ), values)


def downgrade() -> None:
    _require_keys()
    bind = op.get_bind()
    for row in bind.execute(sa.text(
        "SELECT id, phone, medical_record FROM students ORDER BY id"
    )).mappings():
        bind.execute(sa.text(
            "UPDATE students SET phone=:phone, medical_record=:medical_record WHERE id=:id"
        ), {
            "id": row["id"],
            "phone": _decrypt(row["phone"], "students.phone"),
            "medical_record": _decrypt(row["medical_record"], "students.medical_record"),
        })
    for row in bind.execute(sa.text(
        "SELECT id, weight_kg, height_cm, body_fat_pct, muscle_mass_kg, measures, notes "
        "FROM assessments ORDER BY id"
    )).mappings():
        values = {"id": row["id"]}
        for field in ("weight_kg", "height_cm", "body_fat_pct", "muscle_mass_kg"):
            values[field] = None if row[field] is None else json.loads(_decrypt(row[field], f"assessments.{field}"))
        values["measures"] = json.dumps(json.loads(_decrypt(row["measures"], "assessments.measures")))
        values["notes"] = _decrypt(row["notes"], "assessments.notes")
        bind.execute(sa.text(
            "UPDATE assessments SET weight_kg=:weight_kg, height_cm=:height_cm, "
            "body_fat_pct=:body_fat_pct, muscle_mass_kg=:muscle_mass_kg, "
            "measures=CAST(:measures AS jsonb), notes=:notes WHERE id=:id"
        ), values)

    op.drop_constraint("uq_students_tenant_phone_hash", "students", type_="unique")
    op.drop_column("students", "phone_lookup_hash")
    op.alter_column("students", "phone", type_=sa.String(20), postgresql_using="phone::varchar(20)")
    for column, old_type in (
        ("weight_kg", sa.Numeric(6, 2)),
        ("height_cm", sa.Numeric(6, 2)),
        ("body_fat_pct", sa.Numeric(5, 2)),
        ("muscle_mass_kg", sa.Numeric(6, 2)),
    ):
        op.alter_column("assessments", column, type_=old_type, postgresql_using=f"{column}::numeric")
    op.alter_column("assessments", "measures", type_=JSONB(), postgresql_using="measures::jsonb")
    op.create_unique_constraint("uq_students_tenant_phone", "students", ["tenant_id", "phone"])


def _decrypt(value: str, associated_data: str) -> str:
    from app.core.field_encryption import decrypt_text
    return decrypt_text(value, associated_data)
