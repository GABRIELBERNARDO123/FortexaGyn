"""Rotas CRUD de Students (alunos) — isoladas por tenant. Filtro por professor."""
import uuid

from fastapi import APIRouter, Query, status

from app.core.permissions import permission_dependency
from app.core.deps import CurrentTenant, CurrentUser, DBSession
from app.core.permissions import is_allowed
from app.schemas.student import StudentCreate, StudentPublic, StudentUpdate
from app.services import student_service

router = APIRouter(prefix="/students", tags=["students"])


@router.get("", response_model=list[StudentPublic], dependencies=[permission_dependency("students:read")])
def list_students(
    db: DBSession,
    tenant: CurrentTenant,
    user: CurrentUser,
    coach_id: uuid.UUID | None = Query(None, description="Filtra alunos por professor"),
) -> list[StudentPublic]:
    students = student_service.list_students(db, tenant.id, coach_id=coach_id)
    return [_student_public(s, user) for s in students]


@router.post("", response_model=StudentPublic, status_code=status.HTTP_201_CREATED, dependencies=[permission_dependency("students:create")])
def create_student(payload: StudentCreate, db: DBSession, tenant: CurrentTenant, user: CurrentUser) -> StudentPublic:
    if not is_allowed(user, "students:health_write") and payload.medical_record.strip():
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Sem permissão para registrar dados de saúde.")
    student = student_service.create_student(db, tenant.id, payload)
    return _student_public(student, user)


@router.get("/{student_id}", response_model=StudentPublic, dependencies=[permission_dependency("students:read")])
def get_student(student_id: uuid.UUID, db: DBSession, tenant: CurrentTenant, user: CurrentUser) -> StudentPublic:
    student = student_service.get_student(db, tenant.id, student_id)
    return _student_public(student, user)


@router.patch("/{student_id}", response_model=StudentPublic, dependencies=[permission_dependency("students:update")])
def update_student(student_id: uuid.UUID, payload: StudentUpdate, db: DBSession, tenant: CurrentTenant, user: CurrentUser) -> StudentPublic:
    if "medical_record" in payload.model_fields_set and not is_allowed(user, "students:health_write"):
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Sem permissão para alterar dados de saúde.")
    student = student_service.update_student(db, tenant.id, student_id, payload)
    return _student_public(student, user)


@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[permission_dependency("students:delete")])
def delete_student(student_id: uuid.UUID, db: DBSession, tenant: CurrentTenant) -> None:
    student_service.delete_student(db, tenant.id, student_id)

def _student_public(student, user):
    data = StudentPublic.model_validate(student)
    if not is_allowed(user, "students:health_read"):
        data.medical_record = None
    return data
