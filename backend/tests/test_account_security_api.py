"""HTTP security integration tests; run only against the disposable PostgreSQL test DB."""
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta, timezone
from uuid import uuid4
import base64
import os
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError

from app.core.config import get_settings
from app.core.database import SessionLocal, get_db, set_tenant_context
from app.core.security import generate_token, hash_token, hash_password
from app.main import app
from app.models import (
    Assessment, AuditLog, Checkin, Coach, Payment, Product, Sale, SaleItem,
    Session as SessionModel, Software, Student, Tenant, Transaction, User, Workout,
)


@pytest.fixture
def two_accounts(monkeypatch):
    # Chaves exclusivamente sintéticas para estes registros descartáveis de teste.
    from app.core import field_encryption
    test_key = base64.b64encode(b"x" * 32).decode()
    monkeypatch.setattr(field_encryption, "get_settings", lambda: SimpleNamespace(
        PII_ENCRYPTION_KEY=test_key, PII_LOOKUP_KEY=base64.b64encode(b"y" * 32).decode()
    ))
    db = SessionLocal()
    tag = uuid4().hex
    software = Software(name="FitPro test", slug=f"test-{tag}", domain=f"{tag}.test.invalid")
    db.add(software)
    db.flush()
    tenant_a = Tenant(id=uuid4(), software_id=software.id, name="Academia Sintética A")
    tenant_b = Tenant(id=uuid4(), software_id=software.id, name="Academia Sintética B")
    set_tenant_context(db, tenant_a.id)
    db.add(tenant_a)
    db.flush()
    set_tenant_context(db, tenant_b.id)
    db.add(tenant_b)
    db.flush()
    owner_a = User(tenant_id=tenant_a.id, name="Owner A", email=f"owner-a-{tag}@example.com", password_hash=hash_password("test-password-not-used"), role="owner", access_profile="read_only")
    member_a = User(tenant_id=tenant_a.id, name="Member A", email=f"member-a-{tag}@example.com", password_hash=hash_password("test-password-not-used"), role="member", access_profile="read_only")
    owner_b = User(tenant_id=tenant_b.id, name="Owner B", email=f"owner-b-{tag}@example.com", password_hash=hash_password("test-password-not-used"), role="owner", access_profile="read_only")
    set_tenant_context(db, tenant_a.id)
    db.add_all([owner_a, member_a])
    db.flush()
    set_tenant_context(db, tenant_b.id)
    db.add(owner_b)
    db.flush()

    from app.core.field_encryption import phone_lookup_hash
    student_a = Student(tenant_id=tenant_a.id, name="Aluno Sintético A", phone=f"119{tag[:8]}", phone_lookup_hash=phone_lookup_hash(f"119{tag[:8]}"), birth_date=date(2000, 1, 1), medical_record="DADO CLÍNICO SINTÉTICO A", plan="Mensal", price=100, due_day=5, status="active", workout_days=[])
    set_tenant_context(db, tenant_a.id)
    db.add(student_a)
    db.flush()
    set_tenant_context(db, tenant_b.id)
    student_b = Student(tenant_id=tenant_b.id, name="Aluno Sintético B", phone=f"219{tag[:8]}", phone_lookup_hash=phone_lookup_hash(f"219{tag[:8]}"), birth_date=date(2001, 2, 2), medical_record="DADO CLÍNICO SINTÉTICO B", plan="Mensal", price=200, due_day=10, status="active", workout_days=[])
    coach_b = Coach(tenant_id=tenant_b.id, name="Professor Sintético B", status="active")
    product_b = Product(tenant_id=tenant_b.id, name="Produto Sintético B", category="Suplementos", price=25, cost=10, stock=2, min_stock=1)
    db.add_all([student_b, coach_b, product_b])
    db.flush()
    checkin_b = Checkin(tenant_id=tenant_b.id, student_id=student_b.id, note="sintético")
    workout_b = Workout(tenant_id=tenant_b.id, student_id=student_b.id, name="Ficha B", valid_from=date.today(), notes="sintético")
    assessment_b = Assessment(tenant_id=tenant_b.id, student_id=student_b.id, assessed_on=date.today(), measures={}, notes="sintético")
    payment_b = Payment(tenant_id=tenant_b.id, student_id=student_b.id, plan="Mensal", amount=200, paid_on=date.today(), period_start=date.today(), period_end=date.today() + timedelta(days=30), method="pix", note="sintético")
    transaction_b = Transaction(tenant_id=tenant_b.id, kind="income", category="mensalidade", amount=200, description="sintético", occurred_on=date.today(), student_id=student_b.id)
    sale_b = Sale(tenant_id=tenant_b.id, student_id=student_b.id, total=25, method="pix", items=[SaleItem(product_id=product_b.id, quantity=1, unit_price=25)])
    db.add_all([checkin_b, workout_b, assessment_b, payment_b, transaction_b, sale_b])
    db.flush()

    tokens = {}
    for key, user in (("owner_a", owner_a), ("member_a", member_a), ("owner_b", owner_b)):
        set_tenant_context(db, user.tenant_id)
        raw = generate_token()
        tokens[key] = raw
        db.add(SessionModel(user_id=user.id, session_token_hash=hash_token(raw), expires_at=datetime.now(timezone.utc) + timedelta(hours=1)))
        db.flush()
    db.commit()
    ids = {
        "tenant_a": tenant_a.id, "tenant_b": tenant_b.id,
        "owner_a": owner_a.id, "member_a": member_a.id, "owner_b": owner_b.id,
        "student_a": student_a.id, "student_b": student_b.id,
        "coach_b": coach_b.id, "product_b": product_b.id,
        "checkin_b": checkin_b.id, "workout_b": workout_b.id,
        "assessment_b": assessment_b.id, "payment_b": payment_b.id,
        "transaction_b": transaction_b.id, "sale_b": sale_b.id,
    }
    db.close()

    def override_db():
        session = SessionLocal()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_db
    clients = {}
    for key, raw in tokens.items():
        client = TestClient(app, headers={"Origin": "http://testserver"})
        client.cookies.set(get_settings().SESSION_COOKIE_NAME, raw)
        clients[key] = client
    yield {"ids": ids, "clients": clients, "tag": tag}
    for client in clients.values():
        client.close()
    app.dependency_overrides.pop(get_db, None)


def test_each_tenant_only_lists_its_own_data_and_aggregates(two_accounts):
    a = two_accounts["clients"]["owner_a"]
    ids = two_accounts["ids"]
    assert [row["name"] for row in a.get("/api/v1/students").json()] == ["Aluno Sintético A"]
    for path in ("coaches", "products", "checkins", "transactions", "payments", "sales", "workouts", "assessments"):
        response = a.get(f"/api/v1/{path}")
        assert response.status_code == 200, (path, response.text)
        assert response.json() == [], path
    assert a.get(f"/api/v1/students?tenant_id={ids['tenant_b']}").json()[0]["name"] == "Aluno Sintético A"
    dashboard = a.get("/api/v1/dashboard/summary")
    assert dashboard.status_code == 200
    assert dashboard.json()["students"]["total"] == 1
    assert "Aluno Sintético B" not in dashboard.text
    assert "Produto Sintético B" not in dashboard.text


def test_foreign_ids_cannot_be_read_edited_or_deleted(two_accounts):
    a, ids = two_accounts["clients"]["owner_a"], two_accounts["ids"]
    for path, record_id in (("students", "student_b"), ("coaches", "coach_b"), ("products", "product_b"), ("workouts", "workout_b"), ("assessments", "assessment_b")):
        assert a.get(f"/api/v1/{path}/{ids[record_id]}").status_code == 404
    assert a.patch(f"/api/v1/students/{ids['student_b']}", json={"name": "forged"}).status_code == 404
    assert a.patch(f"/api/v1/transactions/{ids['transaction_b']}", json={"amount": 1}).status_code == 404
    for path, record_id in (("checkins", "checkin_b"), ("payments", "payment_b"), ("sales", "sale_b"), ("transactions", "transaction_b"), ("workouts", "workout_b"), ("assessments", "assessment_b"), ("products", "product_b"), ("coaches", "coach_b"), ("students", "student_b")):
        assert a.delete(f"/api/v1/{path}/{ids[record_id]}").status_code == 404, path
    assert a.get(f"/api/v1/payments/next-due/{ids['student_b']}").status_code == 404


def test_foreign_ids_cannot_be_updated_for_every_mutable_resource(two_accounts):
    a, ids = two_accounts["clients"]["owner_a"], two_accounts["ids"]
    attempts = [
        ("students", "student_b", {"name": "Alteração cruzada"}),
        ("coaches", "coach_b", {"name": "Alteração cruzada"}),
        ("products", "product_b", {"price": 1}),
        ("workouts", "workout_b", {"name": "Alteração cruzada"}),
        ("assessments", "assessment_b", {"notes": "Alteração cruzada"}),
        ("transactions", "transaction_b", {"description": "Alteração cruzada"}),
    ]
    for resource, key, payload in attempts:
        response = a.patch(f"/api/v1/{resource}/{ids[key]}", json=payload)
        assert response.status_code == 404, (resource, response.status_code, response.text)


def test_foreign_references_cannot_be_used_to_create_records(two_accounts):
    a, ids = two_accounts["clients"]["owner_a"], two_accounts["ids"]
    today = date.today().isoformat()
    assert a.post("/api/v1/assessments", json={"student_id": str(ids["student_b"]), "assessed_on": today}).status_code == 404
    assert a.post("/api/v1/payments", json={"student_id": str(ids["student_b"]), "plan": "Mensal", "amount": 1, "paid_on": today}).status_code == 404
    assert a.post("/api/v1/sales", json={"student_id": str(ids["student_b"]), "items": []}).status_code == 400
    assert a.post("/api/v1/sales", json={"items": [{"product_id": str(ids["product_b"]), "quantity": 1}]}).status_code == 404


def test_invalid_domain_values_are_rejected_with_400(two_accounts):
    a, ids = two_accounts["clients"]["owner_a"], two_accounts["ids"]
    response = a.post("/api/v1/products", json={"name": "Produto X", "category": "arbitrary", "price": 10})
    assert response.status_code == 400
    response = a.post("/api/v1/students", json={
        "name": "Aluno X", "phone": "11912345678", "birth_date": "2000-01-01",
        "plan": "plano-inventado", "status": "owner", "price": 10,
    })
    assert response.status_code == 400
    response = a.post("/api/v1/assessments", json={
        "student_id": str(ids["student_a"]), "assessed_on": date.today().isoformat(), "body_fat_pct": 150,
    })
    assert response.status_code == 400


def test_forged_tenant_and_cross_tenant_references_are_rejected_or_ignored(two_accounts):
    a, ids = two_accounts["clients"]["owner_a"], two_accounts["ids"]
    response = a.post("/api/v1/students", json={
        "tenant_id": str(ids["tenant_b"]), "name": "Novo Sintético A", "phone": f"319{two_accounts['tag'][:8]}",
        "birth_date": "2000-01-01", "medical_record": "", "plan": "Mensal", "price": 100,
        "due_day": 10, "status": "active",
    })
    assert response.status_code == 201, response.text
    listed = a.get(f"/api/v1/students/{response.json()['id']}")
    assert listed.status_code == 200 and listed.json()["name"] == "Novo Sintético A"
    assert a.post("/api/v1/checkins", json={"student_id": str(ids["student_b"]), "note": "forged"}).status_code == 404
    assert a.post("/api/v1/workouts", json={"student_id": str(ids["student_b"]), "name": "forged", "valid_from": date.today().isoformat(), "exercises": []}).status_code == 404


def test_member_profiles_are_enforced_and_health_data_is_minimized(two_accounts):
    clients, ids = two_accounts["clients"], two_accounts["ids"]
    owner, member = clients["owner_a"], clients["member_a"]
    assert member.get("/api/v1/account").status_code == 403
    assert member.get("/api/v1/users").status_code == 403
    student = member.get("/api/v1/students").json()[0]
    assert student["medical_record"] is None
    assert member.get("/api/v1/transactions").status_code == 403
    assert member.get("/api/v1/assessments").status_code == 403
    assert member.patch(f"/api/v1/users/{ids['member_a']}", json={"access_profile": "operations_admin"}).status_code == 403
    assert member.patch(f"/api/v1/students/{ids['student_a']}", json={"name": "sem permissão"}).status_code == 403

    changed = owner.patch(f"/api/v1/users/{ids['member_a']}", json={"access_profile": "operational"})
    assert changed.status_code == 200 and changed.json()["role"] == "member"
    assert member.get("/api/v1/transactions").status_code == 200
    assert member.get("/api/v1/assessments").status_code == 403

    changed = owner.patch(f"/api/v1/users/{ids['member_a']}", json={"access_profile": "operations_admin"})
    assert changed.status_code == 200
    assert member.get("/api/v1/assessments").status_code == 200
    assert member.get("/api/v1/students").json()[0]["medical_record"] == "DADO CLÍNICO SINTÉTICO A"
    assert member.delete(f"/api/v1/students/{ids['student_a']}").status_code == 204


@pytest.mark.skipif(os.getenv("RUN_RLS_INTEGRATION") != "1", reason="exige migrations RLS aplicadas e conexão de runtime sem bypass")
def test_postgres_rls_blocks_cross_tenant_reads_and_writes(two_accounts):
    """Execute após as migrations usando exatamente o usuário DB da aplicação."""
    db = SessionLocal()
    try:
        role = db.execute(text(
            "SELECT rolsuper OR rolbypassrls FROM pg_roles WHERE rolname=current_user"
        )).scalar_one()
        assert role is False, "RLS não protege conexões superuser/BYPASSRLS"
        ids = two_accounts["ids"]
        expected_tables = {
            "coaches", "products", "students", "checkins", "transactions", "payments",
            "sales", "workouts", "assessments", "workout_exercises", "sale_items", "audit_logs",
            "tenants", "users", "sessions", "email_verifications",
        }
        protected = set(db.execute(text(
            "SELECT relname FROM pg_class WHERE relrowsecurity AND relforcerowsecurity "
            "AND relname = ANY(:tables)"
        ), {"tables": list(expected_tables)}).scalars())
        assert protected == expected_tables

        policies = db.execute(text(
            "SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname=current_schema()"
        )).all()
        policy_map = {(row.tablename, row.policyname, row.cmd) for row in policies}
        for table in {"coaches", "products", "students", "checkins", "transactions", "payments", "sales", "workouts", "assessments", "workout_exercises", "sale_items", "tenants"}:
            assert (table, "tenant_isolation", "ALL") in policy_map
        for policy in (
            ("users", "user_scoped_select", "SELECT"),
            ("users", "user_scoped_insert", "INSERT"),
            ("users", "user_scoped_update", "UPDATE"),
            ("users", "user_scoped_delete", "DELETE"),
            ("sessions", "session_scoped_select", "SELECT"),
            ("sessions", "session_scoped_insert", "INSERT"),
            ("sessions", "session_scoped_update", "UPDATE"),
            ("sessions", "session_scoped_delete", "DELETE"),
            ("email_verifications", "email_verification_by_email", "ALL"),
        ):
            assert policy in policy_map
        for policy in (
            ("audit_logs", "audit_tenant_read", "SELECT"),
            ("audit_logs", "audit_tenant_insert", "INSERT"),
            ("audit_logs", "audit_tenant_update", "UPDATE"),
            ("audit_logs", "audit_tenant_delete", "DELETE"),
        ):
            assert policy in policy_map
        assert not db.execute(text(
            "SELECT has_table_privilege(current_user, 'licenses', 'SELECT')"
        )).scalar_one(), "runtime role must not have direct access to global activation licenses"

        # No tenant context is deny-by-default, including on a connection reused from the pool.
        assert db.execute(text("SELECT id FROM students WHERE id=:id"), {"id": ids["student_b"]}).first() is None
        assert db.execute(text("SELECT id FROM users WHERE id=:id"), {"id": ids["owner_b"]}).first() is None
        assert db.execute(text("SELECT id FROM tenants WHERE id=:id"), {"id": ids["tenant_b"]}).first() is None
        assert db.execute(text("SELECT id FROM sessions")).first() is None
        assert db.execute(text("SELECT id FROM email_verifications")).first() is None
        db.commit()
        assert db.execute(text("SELECT id FROM students WHERE id=:id"), {"id": ids["student_b"]}).first() is None

        db.execute(text("SELECT set_config('app.tenant_id', :tenant, true)"), {"tenant": str(ids["tenant_a"])})
        assert db.execute(text("SELECT id FROM students WHERE id=:id"), {"id": ids["student_a"]}).first() is not None
        assert db.execute(text("SELECT id FROM students WHERE id=:id"), {"id": ids["student_b"]}).first() is None
        changed = db.execute(text("UPDATE students SET name='intrusão' WHERE id=:id"), {"id": ids["student_b"]})
        assert changed.rowcount == 0
        removed = db.execute(text("DELETE FROM students WHERE id=:id"), {"id": ids["student_b"]})
        assert removed.rowcount == 0

        # Writes naming another tenant must fail WITH CHECK instead of creating cross-tenant rows.
        with pytest.raises(DBAPIError) as denied_insert:
            with db.begin_nested():
                db.execute(text("""
                    INSERT INTO students (
                        tenant_id, name, phone, phone_lookup_hash, birth_date, medical_record,
                        workout_days, plan, price, due_day, status
                    ) VALUES (
                        :tenant, 'forged', 'enc:v1:synthetic', :phone_hash, DATE '2000-01-01',
                        'enc:v1:synthetic', '[]'::jsonb, 'Mensal', 0, 10, 'active'
                    )
                """), {"tenant": ids["tenant_b"], "phone_hash": "b" * 64})
        assert getattr(denied_insert.value.orig, "sqlstate", None) == "42501"
        db.commit()

        # SET LOCAL is scoped to the transaction; switching tenants is explicit and isolated.
        db.execute(text("SELECT set_config('app.tenant_id', :tenant, true)"), {"tenant": str(ids["tenant_b"])})
        assert db.execute(text("SELECT id FROM students WHERE id=:id"), {"id": ids["student_b"]}).first() is not None
        db.commit()
        assert db.execute(text("SELECT id FROM students WHERE id=:id"), {"id": ids["student_b"]}).first() is None
    finally:
        db.rollback()
        db.close()


def test_account_admin_is_owner_only_and_logout_revokes_replay(two_accounts):
    clients, ids = two_accounts["clients"], two_accounts["ids"]
    owner, other_owner, member = clients["owner_a"], clients["owner_b"], clients["member_a"]
    account = owner.get("/api/v1/account")
    assert account.status_code == 200 and account.json()["name"] == "Academia Sintética A"
    assert other_owner.get("/api/v1/account").json()["id"] != account.json()["id"]
    assert member.post("/api/v1/account", json={"name": "forged"}).status_code == 405
    assert member.patch("/api/v1/account", json={"name": "forged"}).status_code == 403
    assert owner.patch("/api/v1/account", json={"name": "Academia A Atualizada"}).status_code == 200
    assert owner.patch(f"/api/v1/users/{ids['owner_a']}", json={"access_profile": "operations_admin"}).status_code == 404
    raw_cookie = member.cookies.get(get_settings().SESSION_COOKIE_NAME)
    assert member.post("/api/v1/auth/logout").status_code == 200
    replay = TestClient(app)
    replay.cookies.set(get_settings().SESSION_COOKIE_NAME, raw_cookie)
    try:
        assert replay.get("/api/v1/auth/me").status_code == 401
    finally:
        replay.close()


def test_concurrent_member_creation_allows_exactly_one(two_accounts):
    clients, ids = two_accounts["clients"], two_accounts["ids"]
    owner_b = clients["owner_b"]
    payloads = [
        {"name": f"Membro {i}", "email": f"new-{i}-{two_accounts['tag']}@example.com", "password": "temporary-test-pass-123", "access_profile": "read_only", "role": "owner", "tenant_id": str(ids['tenant_a'])}
        for i in range(2)
    ]
    def create(payload):
        with TestClient(app, headers={"Origin": "http://testserver"}) as client:
            client.cookies.set(get_settings().SESSION_COOKIE_NAME, owner_b.cookies.get(get_settings().SESSION_COOKIE_NAME))
            return client.post("/api/v1/users", json=payload).status_code
    with ThreadPoolExecutor(max_workers=2) as pool:
        statuses = list(pool.map(create, payloads))
    assert sorted(statuses) == [201, 409]
    db = SessionLocal()
    try:
        db.execute(text("SELECT set_config('app.tenant_id', :tenant, true)"), {"tenant": str(ids['tenant_b'])})
        count = db.execute(select(User.id).where(User.tenant_id == ids["tenant_b"], User.role == "member", User.status == "active")).scalars().all()
        assert len(count) == 1
    finally:
        db.close()


def test_revoking_member_invalidates_all_existing_sessions(two_accounts):
    clients, ids = two_accounts["clients"], two_accounts["ids"]
    member = clients["member_a"]
    raw_token = member.cookies.get(get_settings().SESSION_COOKIE_NAME)
    response = clients["owner_a"].delete(f"/api/v1/users/{ids['member_a']}")
    assert response.status_code == 204
    assert member.get("/api/v1/students").status_code == 401
    db = SessionLocal()
    try:
        db.execute(text("SELECT set_config('app.tenant_id', :tenant, true)"), {"tenant": str(ids['tenant_a'])})
        session = db.execute(select(SessionModel).where(SessionModel.session_token_hash == hash_token(raw_token))).scalar_one()
        assert session.revoked_at is not None
        blocked = db.get(User, ids["member_a"])
        assert blocked.status == "blocked"
    finally:
        db.close()


def test_database_rejects_tenant_without_owner(two_accounts):
    from sqlalchemy.exc import IntegrityError
    ids = two_accounts["ids"]
    db = SessionLocal()
    try:
        set_tenant_context(db, ids["tenant_a"])
        db.execute(User.__table__.delete().where(User.id == ids["owner_a"]))
        with pytest.raises(IntegrityError):
            db.commit()
        db.rollback()
        set_tenant_context(db, ids["tenant_a"])
        assert db.get(User, ids["owner_a"]) is not None
    finally:
        db.close()


def test_failed_login_audit_does_not_store_attempted_email(two_accounts):
    tag = two_accounts["tag"]
    with TestClient(app) as client:
        response = client.post("/api/v1/auth/login", json={"email": f"unknown-{tag}@example.com", "password": "synthetic-invalid-password"})
        assert response.status_code == 401
    # Anonymous audit rows are deliberately invisible to the runtime role under
    # RLS. Inspect them with the disposable test migrator role, never by granting
    # anonymous-audit reads to the application role.
    from sqlalchemy import create_engine
    from sqlalchemy.engine import URL
    audit_engine = create_engine(URL.create(
        "postgresql+psycopg", username="fitpro_test_migrator",
        password=os.environ["TEST_MIGRATOR_PASSWORD"], host=os.environ["POSTGRES_HOST"],
        port=int(os.environ["POSTGRES_PORT"]), database=os.environ["POSTGRES_DB"],
    ))
    db = audit_engine.connect()
    try:
        event = db.execute(text("""
            SELECT user_id, tenant_id, resource, resource_id, ip, user_agent
            FROM audit_logs WHERE action = 'LOGIN_FAILED'
            ORDER BY created_at DESC LIMIT 1
        """)).one_or_none()
        assert event is not None and event.user_id is None and event.tenant_id is None
        assert event.resource is None and event.resource_id is None
        assert event.ip is None and event.user_agent is None
    finally:
        db.close()
        audit_engine.dispose()


def test_revoked_member_slot_can_be_reused_without_activating_old_sessions(two_accounts):
    clients, ids, tag = two_accounts["clients"], two_accounts["ids"], two_accounts["tag"]
    owner, previous_member = clients["owner_a"], clients["member_a"]
    old_token = previous_member.cookies.get(get_settings().SESSION_COOKIE_NAME)
    assert owner.delete(f"/api/v1/users/{ids['member_a']}").status_code == 204
    created = owner.post("/api/v1/users", json={
        "name": "Membro Substituto", "email": f"replacement-{tag}@example.com",
        "password": "synthetic-initial-password-123", "access_profile": "operational",
    })
    assert created.status_code == 201, created.text
    assert created.json()["role"] == "member"
    assert created.json()["access_profile"] == "operational"
    assert previous_member.get("/api/v1/students").status_code == 401
    account = owner.get("/api/v1/account").json()
    assert account["additional_user"]["id"] == created.json()["id"]
    db = SessionLocal()
    try:
        set_tenant_context(db, ids["tenant_a"])
        assert [str(member_id) for member_id in db.execute(select(User.id).where(User.tenant_id == ids["tenant_a"], User.role == "member", User.status == "active")).scalars().all()] == [created.json()["id"]]
        session = db.execute(select(SessionModel).where(SessionModel.session_token_hash == hash_token(old_token))).scalar_one()
        assert session.revoked_at is not None
    finally:
        db.close()


def test_mutating_request_rejects_foreign_origin_and_sets_security_headers(two_accounts):
    client = two_accounts["clients"]["owner_a"]
    blocked = client.patch("/api/v1/account", json={"name": "Nope"}, headers={"Origin": "https://attacker.invalid"})
    assert blocked.status_code == 403
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 200
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
    assert response.headers["cache-control"] == "no-store"


def test_login_rate_limit_is_applied():
    from app.core.rate_limit import limiter

    limiter.reset()
    with TestClient(app) as client:
        statuses = [
            client.post("/api/v1/auth/login", json={"email": "unknown-rate-test@example.com", "password": "synthetic-invalid-password"}).status_code
            for _ in range(6)
        ]
    assert statuses[:5] == [401] * 5
    assert statuses[5] == 429


def test_production_settings_require_secure_cookie_cors_and_dev_mode_off():
    from pydantic import ValidationError
    from app.core.config import Settings

    base = {
        "_env_file": None,
        "POSTGRES_USER": "audit",
        "POSTGRES_PASSWORD": "throwaway-audit-only",
        "POSTGRES_DB": "audit",
        "SECRET_KEY": "local-audit-key-that-is-longer-than-thirty-two-characters",
        "ENV": "production",
        "CORS_ORIGINS": "https://app.example.invalid",
        "SESSION_COOKIE_SECURE": None,
    }
    assert Settings(**base).SESSION_COOKIE_SECURE is True
    with pytest.raises(ValidationError):
        Settings(**base, DEV_MODE=True)
    with pytest.raises(ValidationError):
        Settings(**{**base, "CORS_ORIGINS": "*"})


def test_only_owner_can_register_custom_payment_terms(two_accounts):
    clients, ids = two_accounts["clients"], two_accounts["ids"]
    today = date.today().isoformat()
    owner, member = clients["owner_a"], clients["member_a"]
    assert owner.patch(f"/api/v1/users/{ids['member_a']}", json={"access_profile": "operational"}).status_code == 200
    payment = {
        "student_id": str(ids["student_a"]), "plan": "Mensal", "amount": 99,
        "paid_on": today,
    }
    assert member.post("/api/v1/payments", json=payment).status_code == 403
    accepted = owner.post("/api/v1/payments", json=payment)
    assert accepted.status_code == 201, accepted.text
    assert accepted.json()["amount"] == 99
