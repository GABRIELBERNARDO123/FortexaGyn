"""Rotas de Assessment (avaliação física) — isoladas por tenant."""
import uuid

from fastapi import APIRouter, Query, status

from app.core.permissions import permission_dependency
from app.core.deps import CurrentTenant, DBSession
from app.schemas.assessment import AssessmentCreate, AssessmentOut, AssessmentUpdate
from app.services import assessment_service

router = APIRouter(prefix="/assessments", tags=["assessments"])


@router.get("", response_model=list[AssessmentOut], dependencies=[permission_dependency("assessments:read")])
def list_assessments(
    db: DBSession,
    tenant: CurrentTenant,
    student_id: uuid.UUID | None = Query(None),
):
    return assessment_service.list_assessments(db, tenant.id, student_id=student_id)


@router.get("/{assessment_id}", response_model=AssessmentOut, dependencies=[permission_dependency("assessments:read")])
def get_assessment(assessment_id: uuid.UUID, db: DBSession, tenant: CurrentTenant):
    return assessment_service.get_assessment(db, tenant.id, assessment_id)


@router.post("", response_model=AssessmentOut, status_code=status.HTTP_201_CREATED, dependencies=[permission_dependency("assessments:create")])
def create_assessment(payload: AssessmentCreate, db: DBSession, tenant: CurrentTenant):
    return assessment_service.create_assessment(db, tenant.id, payload)


@router.patch("/{assessment_id}", response_model=AssessmentOut, dependencies=[permission_dependency("assessments:update")])
def update_assessment(assessment_id: uuid.UUID, payload: AssessmentUpdate, db: DBSession, tenant: CurrentTenant):
    return assessment_service.update_assessment(db, tenant.id, assessment_id, payload)


@router.delete("/{assessment_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[permission_dependency("assessments:delete")])
def delete_assessment(assessment_id: uuid.UUID, db: DBSession, tenant: CurrentTenant):
    assessment_service.delete_assessment(db, tenant.id, assessment_id)
