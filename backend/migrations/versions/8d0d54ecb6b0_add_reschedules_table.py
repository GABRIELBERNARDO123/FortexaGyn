"""add reschedules table

Revision ID: 8d0d54ecb6b0
Revises: e8d670b6a968
Create Date: 2026-10-15

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "8d0d54ecb6b0"
down_revision = "e8d670b6a968"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "reschedules",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False),
        sa.Column("student_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("students.id", ondelete="CASCADE"), nullable=False),
        sa.Column("missed_date", sa.Date(), nullable=False),
        sa.Column("new_date", sa.Date(), nullable=False),
        sa.Column("new_time", sa.String(10), nullable=True),
        sa.Column("reason", sa.Text(), nullable=False, server_default=""),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_reschedules_tenant_id", "reschedules", ["tenant_id"])
    op.create_index("ix_reschedules_student_id", "reschedules", ["student_id"])
    op.create_index("ix_reschedules_missed_date", "reschedules", ["missed_date"])
    op.create_index("ix_reschedules_new_date", "reschedules", ["new_date"])


def downgrade() -> None:
    op.drop_table("reschedules")
