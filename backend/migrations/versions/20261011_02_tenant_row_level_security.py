"""Force tenant-scoped PostgreSQL RLS on all tenant-owned business tables."""
from alembic import op

revision = "20261011_02"
down_revision = "20261011_01"
branch_labels = None
depends_on = None

_TENANT_TABLES = (
    "coaches", "products", "students", "checkins", "transactions", "payments",
    "sales", "workouts", "assessments",
)
_AUTH_TABLES = ("tenants", "users", "sessions", "email_verifications")


def upgrade() -> None:
    op.execute("ALTER TABLE tenants ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE tenants FORCE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY tenant_isolation ON tenants
        USING (id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
        WITH CHECK (id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    """)

    # Authentication needs narrow pre-tenant lookups. Each lookup is bound to
    # the exact email/hash supplied by the backend and never grants table scans.
    op.execute("ALTER TABLE users ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE users FORCE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY user_scoped_select ON users FOR SELECT
        USING (
            tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
            OR id::text = NULLIF(current_setting('app.session_user_id', true), '')
            OR lower(email) = lower(NULLIF(current_setting('app.login_email', true), ''))
        )
    """)
    op.execute("""
        CREATE POLICY user_scoped_insert ON users FOR INSERT
        WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    """)
    op.execute("""
        CREATE POLICY user_scoped_update ON users FOR UPDATE
        USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
        WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    """)
    op.execute("""
        CREATE POLICY user_scoped_delete ON users FOR DELETE
        USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    """)

    op.execute("ALTER TABLE sessions ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE sessions FORCE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY session_scoped_select ON sessions FOR SELECT
        USING (
            session_token_hash = NULLIF(current_setting('app.session_token_hash', true), '')
            OR EXISTS (
                SELECT 1 FROM users u WHERE u.id = sessions.user_id
                  AND u.tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
            )
        )
    """)
    for command in ("INSERT", "UPDATE", "DELETE"):
        clause = "WITH CHECK" if command == "INSERT" else "USING"
        op.execute(f"""
            CREATE POLICY session_scoped_{command.lower()} ON sessions FOR {command}
            {clause} (EXISTS (
                SELECT 1 FROM users u WHERE u.id = sessions.user_id
                  AND u.tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
            ))
        """)

    op.execute("ALTER TABLE email_verifications ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE email_verifications FORCE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY email_verification_by_email ON email_verifications
        USING (lower(email) = lower(NULLIF(current_setting('app.login_email', true), '')))
        WITH CHECK (lower(email) = lower(NULLIF(current_setting('app.login_email', true), '')))
    """)

    for table in _TENANT_TABLES:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")
        op.execute(f"""
            CREATE POLICY tenant_isolation ON {table}
            USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
            WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
        """)

    # Tabelas filhas não têm tenant_id; autorização vem de seus pais, incluindo o produto.
    op.execute("ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE workout_exercises FORCE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY tenant_isolation ON workout_exercises
        USING (EXISTS (
            SELECT 1 FROM workouts w
            WHERE w.id = workout_exercises.workout_id
              AND w.tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
        ))
        WITH CHECK (EXISTS (
            SELECT 1 FROM workouts w
            WHERE w.id = workout_exercises.workout_id
              AND w.tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid
        ))
    """)
    op.execute("ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE sale_items FORCE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY tenant_isolation ON sale_items
        USING (
            EXISTS (SELECT 1 FROM sales s WHERE s.id = sale_items.sale_id
                    AND s.tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
            AND EXISTS (SELECT 1 FROM products p WHERE p.id = sale_items.product_id
                        AND p.tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
        )
        WITH CHECK (
            EXISTS (SELECT 1 FROM sales s WHERE s.id = sale_items.sale_id
                    AND s.tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
            AND EXISTS (SELECT 1 FROM products p WHERE p.id = sale_items.product_id
                        AND p.tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
        )
    """)

    # Login failures may be anonymous (tenant_id NULL); they can be written but never read cross-tenant.
    op.execute("ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY")
    op.execute("""
        CREATE POLICY audit_tenant_read ON audit_logs FOR SELECT
        USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    """)
    op.execute("""
        CREATE POLICY audit_tenant_insert ON audit_logs FOR INSERT
        WITH CHECK (tenant_id IS NULL OR tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    """)
    op.execute("""
        CREATE POLICY audit_tenant_update ON audit_logs FOR UPDATE
        USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
        WITH CHECK (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    """)
    op.execute("""
        CREATE POLICY audit_tenant_delete ON audit_logs FOR DELETE
        USING (tenant_id = NULLIF(current_setting('app.tenant_id', true), '')::uuid)
    """)


def downgrade() -> None:
    for table, policy in (
        ("audit_logs", "audit_tenant_read"),
        ("audit_logs", "audit_tenant_insert"),
        ("audit_logs", "audit_tenant_update"),
        ("audit_logs", "audit_tenant_delete"),
        ("sale_items", "tenant_isolation"),
        ("workout_exercises", "tenant_isolation"),
        *((table, "tenant_isolation") for table in _TENANT_TABLES),
        ("email_verifications", "email_verification_by_email"),
        ("sessions", "session_scoped_delete"),
        ("sessions", "session_scoped_update"),
        ("sessions", "session_scoped_insert"),
        ("sessions", "session_scoped_select"),
        ("users", "user_scoped_delete"),
        ("users", "user_scoped_update"),
        ("users", "user_scoped_insert"),
        ("users", "user_scoped_select"),
        ("tenants", "tenant_isolation"),
    ):
        op.execute(f"DROP POLICY {policy} ON {table}")
    for table in (*_TENANT_TABLES, "workout_exercises", "sale_items", "audit_logs", *_AUTH_TABLES):
        op.execute(f"ALTER TABLE {table} NO FORCE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY")
