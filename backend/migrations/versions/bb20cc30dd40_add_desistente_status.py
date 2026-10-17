"""add desistente status to students

Revision ID: bb20cc30dd40
Revises: aa10bb20cc30
Create Date: 2026-10-17

"""
from alembic import op

revision = "bb20cc30dd40"
down_revision = "aa10bb20cc30"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE students DROP CONSTRAINT IF EXISTS ck_students_status")
    op.execute(
        "ALTER TABLE students ADD CONSTRAINT ck_students_status "
        "CHECK (status IN ('active', 'inactive', 'desistente'))"
    )


def downgrade() -> None:
    # Antes de voltar, mudar desistentes para inativos para não quebrar
    op.execute("UPDATE students SET status = 'inactive' WHERE status = 'desistente'")
    op.execute("ALTER TABLE students DROP CONSTRAINT IF EXISTS ck_students_status")
    op.execute(
        "ALTER TABLE students ADD CONSTRAINT ck_students_status "
        "CHECK (status IN ('active', 'inactive'))"
    )
