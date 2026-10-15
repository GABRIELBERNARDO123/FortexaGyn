"""Verify migrated ciphertext and execute the integration suite as fitpro_app."""
from __future__ import annotations

import subprocess
import sys
from uuid import UUID

from sqlalchemy import create_engine, text

from app.core.config import get_settings
from app.core.database import SessionLocal
from app.models import Assessment, Student


TENANT_ID = UUID("72b1b09e-72d5-4d7b-913e-fc8c4c08e002")
STUDENT_ID = UUID("72b1b09e-72d5-4d7b-913e-fc8c4c08e004")
ASSESSMENT_ID = UUID("72b1b09e-72d5-4d7b-913e-fc8c4c08e005")


def main() -> None:
    settings = get_settings()
    db = SessionLocal()
    try:
        role = db.execute(text(
            "SELECT rolsuper OR rolbypassrls FROM pg_roles WHERE rolname=current_user"
        )).scalar_one()
        assert role is False, "validation role must not be superuser/BYPASSRLS"
        assert not db.execute(text(
            "SELECT has_table_privilege(current_user, 'licenses', 'SELECT')"
        )).scalar_one(), "runtime role must not read global activation licenses"
        db.execute(text("SELECT set_config('app.tenant_id', :tenant, true)"), {"tenant": str(TENANT_ID)})
        student = db.get(Student, STUDENT_ID)
        assessment = db.get(Assessment, ASSESSMENT_ID)
        assert student and student.phone == "11912345678"
        assert student.medical_record == "synthetic health note"
        assert assessment and assessment.weight_kg == 70.25
        assert assessment.measures == {"waist": 80}
        assert assessment.notes == "synthetic assessment note"
        raw = db.execute(text("SELECT phone, medical_record FROM students WHERE id=:id"), {"id": STUDENT_ID}).one()
        assert raw.phone.startswith("enc:v1:") and raw.medical_record.startswith("enc:v1:")
        print("Migrated synthetic sensitive fields decrypt correctly; storage contains ciphertext.")
    finally:
        db.rollback()
        db.close()

    print("Running pytest as the restricted fitpro_app PostgreSQL role.")
    subprocess.run([sys.executable, "-m", "pytest", "-q", "--tb=short", "-o", "cache_dir=/tmp/pytest-cache"], check=True)


if __name__ == "__main__":
    main()
