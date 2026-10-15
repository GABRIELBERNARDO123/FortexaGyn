from types import SimpleNamespace
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.models.coach import Coach
from app.models.product import Product
from app.models.student import Student
from app.models.workout import Workout


class Result:
    def __init__(self, value):
        self.value = value

    def scalar_one_or_none(self):
        return self.value


class FakeDB:
    def __init__(self, records=None):
        self.records = records or {}
        self.statements = []

    def execute(self, statement):
        self.statements.append(statement)
        entity = statement.column_descriptions[0].get("entity")
        return Result(self.records.get(entity))


def assert_tenant_scoped(db):
    assert db.statements
    assert all("tenant_id" in str(statement) for statement in db.statements)


def test_student_create_rejects_coach_from_another_tenant():
    from app.services import student_service

    db = FakeDB()
    with pytest.raises(HTTPException) as err:
        student_service.create_student(db, uuid4(), SimpleNamespace(coach_id=uuid4()))
    assert err.value.status_code == 404
    assert_tenant_scoped(db)


def test_student_update_rejects_coach_from_another_tenant():
    from app.services import student_service

    db = FakeDB({Student: object()})
    with pytest.raises(HTTPException) as err:
        student_service.update_student(db, uuid4(), uuid4(), SimpleNamespace(model_dump=lambda **_: {"coach_id": uuid4()}))
    assert err.value.status_code == 404
    assert_tenant_scoped(db)


def test_workout_create_rejects_coach_from_another_tenant():
    from app.services import workout_service

    db = FakeDB({Student: object()})
    payload = SimpleNamespace(student_id=uuid4(), coach_id=uuid4())
    with pytest.raises(HTTPException) as err:
        workout_service.create_workout(db, uuid4(), payload)
    assert err.value.status_code == 404
    assert_tenant_scoped(db)


def test_workout_update_rejects_coach_from_another_tenant():
    from app.services import workout_service

    db = FakeDB({Workout: SimpleNamespace()})
    payload = SimpleNamespace(model_dump=lambda **_: {"coach_id": uuid4()})
    with pytest.raises(HTTPException) as err:
        workout_service.update_workout(db, uuid4(), uuid4(), payload)
    assert err.value.status_code == 404
    assert_tenant_scoped(db)


def test_sale_rejects_student_from_another_tenant():
    from app.services import sale_service

    db = FakeDB()
    payload = SimpleNamespace(items=[object()], student_id=uuid4())
    with pytest.raises(HTTPException) as err:
        sale_service.create_sale(db, uuid4(), payload)
    assert err.value.status_code == 404
    assert_tenant_scoped(db)


def test_transaction_rejects_student_from_another_tenant():
    from app.services import transaction_service

    db = FakeDB()
    payload = SimpleNamespace(student_id=uuid4(), product_id=None)
    with pytest.raises(HTTPException) as err:
        transaction_service.create_transaction(db, uuid4(), payload)
    assert err.value.status_code == 404
    assert_tenant_scoped(db)


def test_transaction_rejects_product_from_another_tenant():
    from app.services import transaction_service

    db = FakeDB()
    payload = SimpleNamespace(student_id=None, product_id=uuid4())
    with pytest.raises(HTTPException) as err:
        transaction_service.create_transaction(db, uuid4(), payload)
    assert err.value.status_code == 404
    assert_tenant_scoped(db)


def test_auth_audit_ip_does_not_trust_unverified_forwarded_header():
    from app.api.v1.auth import _client_ip

    request = SimpleNamespace(
        headers={"x-forwarded-for": "203.0.113.9"},
        client=SimpleNamespace(host="127.0.0.1"),
    )
    assert _client_ip(request) == "127.0.0.1"


def test_users_list_route_requires_owner_role():
    from app.api.v1.users import router
    from app.core.deps import require_owner

    route = next(route for route in router.routes if getattr(route, "path", None) == "/users")
    pending = list(route.dependant.dependencies)
    found = False
    while pending:
        dependency = pending.pop()
        if dependency.call is require_owner:
            found = True
            break
        pending.extend(dependency.dependencies)
    assert found


def test_member_cannot_pass_owner_guard():
    from app.core.deps import require_owner

    with pytest.raises(HTTPException) as err:
        require_owner(SimpleNamespace(role="member"))
    assert err.value.status_code == 403
