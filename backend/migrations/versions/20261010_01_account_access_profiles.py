"""Persist member access profiles and enforce active account membership limits."""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision = "20261010_01"
down_revision = "838ca319150c"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    duplicates = bind.execute(text(
        "SELECT count(*) FROM (SELECT lower(email) FROM users "
        "GROUP BY lower(email) HAVING count(*) > 1) duplicated"
    )).scalar_one()
    if duplicates:
        raise RuntimeError(
            "Migration interrompida: existem e-mails duplicados entre tenants. "
            "Resolva a identidade duplicada antes da constraint global; nenhum registro foi removido."
        )

    op.add_column(
        "users",
        sa.Column("access_profile", sa.String(length=32), nullable=False,
                  server_default="read_only"),
    )
    op.create_check_constraint(
        "ck_users_access_profile", "users",
        "access_profile IN ('read_only','operational','operations_admin')",
    )
    op.drop_constraint("uq_users_tenant_role", "users", type_="unique")
    op.create_index(
        "uq_users_one_owner_per_tenant", "users", ["tenant_id"], unique=True,
        postgresql_where=text("role = 'owner'"),
    )
    op.create_index(
        "uq_users_one_active_member_per_tenant", "users", ["tenant_id"], unique=True,
        postgresql_where=text("role = 'member' AND status = 'active'"),
    )
    op.create_index(
        "uq_users_email_lower_global", "users", [sa.text("lower(email)")], unique=True,
    )


def downgrade() -> None:
    bind = op.get_bind()
    historical_duplicates = bind.execute(text(
        "SELECT count(*) FROM (SELECT tenant_id FROM users WHERE role='member' "
        "GROUP BY tenant_id HAVING count(*) > 1) duplicated"
    )).scalar_one()
    if historical_duplicates:
        raise RuntimeError(
            "Downgrade recusado: há membros revogados preservados; restaurar a constraint "
            "antiga exigiria eliminar histórico, o que não é feito automaticamente."
        )
    op.drop_index("uq_users_email_lower_global", table_name="users")
    op.drop_index("uq_users_one_active_member_per_tenant", table_name="users")
    op.drop_index("uq_users_one_owner_per_tenant", table_name="users")
    op.create_unique_constraint("uq_users_tenant_role", "users", ["tenant_id", "role"])
    op.drop_constraint("ck_users_access_profile", "users", type_="check")
    op.drop_column("users", "access_profile")
