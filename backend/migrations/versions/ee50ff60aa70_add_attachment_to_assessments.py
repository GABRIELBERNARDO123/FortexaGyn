"""add attachments to assessments

Revision ID: ee50ff60aa70
Revises: dd40ee50ff60
Create Date: 2026-10-17

"""
from alembic import op
import sqlalchemy as sa

revision = "ee50ff60aa70"
down_revision = "dd40ee50ff60"
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.add_column("assessments", sa.Column("attachment_name", sa.Text(), nullable=True))
    op.add_column("assessments", sa.Column("attachment_type", sa.Text(), nullable=True))
    op.add_column("assessments", sa.Column("attachment_data", sa.Text(), nullable=True))

def downgrade() -> None:
    op.drop_column("assessments", "attachment_data")
    op.drop_column("assessments", "attachment_type")
    op.drop_column("assessments", "attachment_name")
