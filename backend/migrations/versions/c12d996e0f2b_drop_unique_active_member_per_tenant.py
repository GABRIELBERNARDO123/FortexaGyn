"""drop unique active member per tenant

Revision ID: c12d996e0f2b
Revises: 20261011_02
Create Date: 2026-10-13

"""
from alembic import op


revision = "c12d996e0f2b"
down_revision = "20261011_02"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Remove o índice parcial que limitava 1 member ativo por tenant.
    # O limite de 2 agora é validado na aplicação (users.py).
    op.execute("DROP INDEX IF EXISTS uq_users_one_active_member_per_tenant")


def downgrade() -> None:
    # Recria o índice (só funciona se houver <= 1 member ativo por tenant).
    op.execute(
        "CREATE UNIQUE INDEX uq_users_one_active_member_per_tenant "
        "ON users (tenant_id) "
        "WHERE role = 'member' AND status = 'active'"
    )