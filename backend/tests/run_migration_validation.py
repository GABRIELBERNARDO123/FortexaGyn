"""Runs only inside docker-compose.test's disposable PostgreSQL instance."""
from __future__ import annotations

import os
import subprocess
import sys
from uuid import UUID

from sqlalchemy import create_engine, text

from app.core.config import get_settings


SOFTWARE_ID = UUID("72b1b09e-72d5-4d7b-913e-fc8c4c08e001")
TENANT_ID = UUID("72b1b09e-72d5-4d7b-913e-fc8c4c08e002")
OWNER_ID = UUID("72b1b09e-72d5-4d7b-913e-fc8c4c08e003")
STUDENT_ID = UUID("72b1b09e-72d5-4d7b-913e-fc8c4c08e004")
ASSESSMENT_ID = UUID("72b1b09e-72d5-4d7b-913e-fc8c4c08e005")


def run(*args: str) -> None:
    subprocess.run([sys.executable, "-m", "alembic", *args], check=True)


def main() -> None:
    settings = get_settings()
    engine = create_engine(settings.database_url)

    run("heads")
    run("history")
    run("upgrade", "20261010_02")

    # Seed plaintext legacy values exactly at the schema immediately before encryption.
    with engine.begin() as conn:
        conn.execute(text("""
            INSERT INTO softwares (id, name, slug, domain)
            VALUES (:id, 'Synthetic migration test', 'synthetic-migration', 'migration.test.invalid')
        """), {"id": SOFTWARE_ID})
        conn.execute(text("""
            INSERT INTO tenants (id, software_id, name)
            VALUES (:id, :software_id, 'Tenant migration synthetic')
        """), {"id": TENANT_ID, "software_id": SOFTWARE_ID})
        conn.execute(text("""
            INSERT INTO users (id, tenant_id, name, email, password_hash, role)
            VALUES (:id, :tenant_id, 'Owner synthetic', 'owner-migration@example.invalid', 'not-a-real-password-hash', 'owner')
        """), {"id": OWNER_ID, "tenant_id": TENANT_ID})
        conn.execute(text("""
            INSERT INTO students (
                id, tenant_id, name, phone, birth_date, medical_record,
                workout_days, plan, price, due_day, status
            ) VALUES (
                :id, :tenant_id, 'Student synthetic', '11912345678', DATE '2000-01-01',
                'synthetic health note', '[]'::jsonb, 'Mensal', 100, 10, 'active'
            )
        """), {"id": STUDENT_ID, "tenant_id": TENANT_ID})
        conn.execute(text("""
            INSERT INTO assessments (
                id, tenant_id, student_id, assessed_on, weight_kg, height_cm,
                body_fat_pct, muscle_mass_kg, measures, notes
            ) VALUES (
                :id, :tenant_id, :student_id, DATE '2026-01-01', 70.25, 175.00,
                18.50, 32.00, '{"waist": 80}'::jsonb, 'synthetic assessment note'
            )
        """), {"id": ASSESSMENT_ID, "tenant_id": TENANT_ID, "student_id": STUDENT_ID})

    run("upgrade", "head")

    # The app role is intentionally separate from the migrator and has no LICENSE access.
    with engine.begin() as conn:
        conn.execute(text("GRANT USAGE ON SCHEMA public TO fitpro_app"))
        conn.execute(text(
            "GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO fitpro_app"
        ))
        conn.execute(text("REVOKE ALL ON TABLE licenses FROM fitpro_app"))
        conn.execute(text(
            "GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO fitpro_app"
        ))

    run("current")
    print("Migration validation: empty database -> pre-encryption revision -> synthetic legacy rows -> head")


if __name__ == "__main__":
    main()
