"""add pix config to tenants

Revision ID: e8d670b6a968
Revises: 535e702c3431
Create Date: 2026-10-13

"""
from alembic import op
import sqlalchemy as sa


revision = "e8d670b6a968"
down_revision = "535e702c3431"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("tenants", sa.Column("pix_key", sa.String(200), nullable=True))
    op.add_column("tenants", sa.Column("pix_name", sa.String(120), nullable=True))
    op.add_column("tenants", sa.Column("phone", sa.String(20), nullable=True))
    op.add_column("tenants", sa.Column("address", sa.String(200), nullable=True))


def downgrade() -> None:
    op.drop_column("tenants", "address")
    op.drop_column("tenants", "phone")
    op.drop_column("tenants", "pix_name")
    op.drop_column("tenants", "pix_key")
