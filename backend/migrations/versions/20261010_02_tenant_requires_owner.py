"""Enforce that every committed tenant has exactly one owner."""
from alembic import op

revision = "20261010_02"
down_revision = "20261010_01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
    CREATE FUNCTION fitpro_assert_tenant_owner() RETURNS trigger
    LANGUAGE plpgsql AS $$
    DECLARE tenant_ids uuid[];
    DECLARE target_id uuid;
    BEGIN
      IF TG_TABLE_NAME = 'tenants' THEN
        IF TG_OP = 'DELETE' THEN tenant_ids := ARRAY[OLD.id];
        ELSE tenant_ids := ARRAY[NEW.id]; END IF;
      ELSIF TG_OP = 'INSERT' THEN tenant_ids := ARRAY[NEW.tenant_id];
      ELSIF TG_OP = 'DELETE' THEN tenant_ids := ARRAY[OLD.tenant_id];
      ELSE tenant_ids := ARRAY[OLD.tenant_id, NEW.tenant_id];
      END IF;

      FOREACH target_id IN ARRAY tenant_ids LOOP
        IF target_id IS NOT NULL
          AND EXISTS (SELECT 1 FROM tenants WHERE id = target_id)
          AND NOT EXISTS (SELECT 1 FROM users WHERE tenant_id = target_id AND role = 'owner')
        THEN
          RAISE EXCEPTION 'Every tenant must retain exactly one owner'
            USING ERRCODE = '23514', CONSTRAINT = 'tenant_requires_owner';
        END IF;
      END LOOP;
      RETURN NULL;
    END;
    $$;
    """)
    op.execute("""
    CREATE CONSTRAINT TRIGGER tr_tenant_requires_owner
    AFTER INSERT OR DELETE ON tenants
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION fitpro_assert_tenant_owner();
    """)
    op.execute("""
    CREATE CONSTRAINT TRIGGER tr_user_preserves_tenant_owner
    AFTER INSERT OR UPDATE OR DELETE ON users
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW EXECUTE FUNCTION fitpro_assert_tenant_owner();
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS tr_user_preserves_tenant_owner ON users")
    op.execute("DROP TRIGGER IF EXISTS tr_tenant_requires_owner ON tenants")
    op.execute("DROP FUNCTION IF EXISTS fitpro_assert_tenant_owner()")
