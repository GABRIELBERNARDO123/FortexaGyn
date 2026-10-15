"""allow tablet_checkin access profile

Revision ID: 535e702c3431
Revises: c12d996e0f2b
Create Date: 2026-10-13 09:13:06.907322

"""
from alembic import op


revision = "535e702c3431"
down_revision = "c12d996e0f2b"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Recria o CHECK incluindo o novo perfil tablet_checkin.
    op.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS ck_users_access_profile")
    op.execute(
        "ALTER TABLE users ADD CONSTRAINT ck_users_access_profile "
        "CHECK (access_profile IN ('read_only','operational','operations_admin','tablet_checkin'))"
    )


def downgrade() -> None:
    # Antes de voltar, garante que não sobrou nenhum tablet_checkin.
    op.execute("UPDATE users SET access_profile = 'operational' WHERE access_profile = 'tablet_checkin'")
    op.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS ck_users_access_profile")
    op.execute(
        "ALTER TABLE users ADD CONSTRAINT ck_users_access_profile "
        "CHECK (access_profile IN ('read_only','operational','operations_admin'))"
    )
