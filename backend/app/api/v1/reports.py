import uuid
from datetime import date, datetime
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.core.deps import CurrentTenant, DBSession, CurrentUser
from app.core.permissions import permission_dependency
from app.models.report import Report
from app.models.student import Student
from app.models.payment import Payment
from app.models.checkin import Checkin
from app.schemas.report import ReportCreate, ReportOut, ReportUpdate

router = APIRouter(prefix="/reports", tags=["reports"])

# Só o Dono tem "reports:read" e "reports:create" no sistema
@router.get("", response_model=list[ReportOut], dependencies=[permission_dependency("reports:read")])
def list_reports(db: DBSession, tenant: CurrentTenant):
    stmt = select(Report).where(Report.tenant_id == tenant.id).order_by(Report.created_at.desc())
    return [ReportOut.model_validate(r) for r in db.execute(stmt).scalars().all()]

@router.post("", response_model=ReportOut, status_code=status.HTTP_201_CREATED, dependencies=[permission_dependency("reports:read")])
def create_report(payload: ReportCreate, db: DBSession, tenant: CurrentTenant):
    r = Report(tenant_id=tenant.id, title=payload.title, content=payload.content or '', file_name=payload.file_name, file_type=payload.file_type, file_data=payload.file_data)
    db.add(r); db.commit(); db.refresh(r)
    return ReportOut.model_validate(r)

@router.patch("/{report_id}", response_model=ReportOut, dependencies=[permission_dependency("reports:read")])
def update_report(report_id: uuid.UUID, payload: ReportUpdate, db: DBSession, tenant: CurrentTenant):
    r = db.execute(select(Report).where(Report.id == report_id, Report.tenant_id == tenant.id)).scalar_one_or_none()
    if not r: raise HTTPException(404, "Relatório não encontrado")
    if payload.title is not None: r.title = payload.title
    if payload.content is not None: r.content = payload.content
    if payload.file_name is not None: r.file_name = payload.file_name
    if payload.file_type is not None: r.file_type = payload.file_type
    if payload.file_data is not None: r.file_data = payload.file_data
    db.commit(); db.refresh(r)
    return ReportOut.model_validate(r)

@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[permission_dependency("reports:read")])
def delete_report(report_id: uuid.UUID, db: DBSession, tenant: CurrentTenant):
    r = db.execute(select(Report).where(Report.id == report_id, Report.tenant_id == tenant.id)).scalar_one_or_none()
    if not r: raise HTTPException(404, "Relatório não encontrado")
    db.delete(r); db.commit()

@router.post("/generate", response_model=ReportOut, status_code=status.HTTP_201_CREATED, dependencies=[permission_dependency("reports:read")])
def generate_auto_report(db: DBSession, tenant: CurrentTenant):
    today = date.today()
    
    # 1. Puxa dados básicos
    students = db.execute(select(Student).where(Student.tenant_id == tenant.id)).scalars().all()
    ativos = sum(1 for s in students if s.status == 'active')
    inativos = sum(1 for s in students if s.status == 'inactive')
    desistentes = sum(1 for s in students if s.status == 'desistente')
    
    payments = db.execute(select(Payment).where(Payment.tenant_id == tenant.id)).scalars().all()
    total_recebido = sum(float(p.amount) for p in payments)
    
    checkins = db.execute(select(Checkin).where(Checkin.tenant_id == tenant.id)).scalars().all()
    total_checkins = len(checkins)

    # 2. Monta o texto
    content = f"""RELATÓRIO GERENCIAL - {tenant.name.upper()}
Data de Emissão: {today.strftime('%d/%m/%Y')}

=== QUADRO DE ALUNOS ===
Total de Alunos Cadastrados: {len(students)}
Alunos Ativos: {ativos}
Alunos Inativos: {inativos}
Alunos Desistentes: {desistentes}

=== FINANCEIRO GERAL ===
Receita Total Registrada: R$ {total_recebido:,.2f}

=== FREQUÊNCIA ===
Total de Check-ins Históricos: {total_checkins}

=== OBSERVAÇÕES ===
(Academia em operação normal. Dados gerados automaticamente pelo sistema FortexaGym.)
"""
    
    title = f"Relatório Automático - {today.strftime('%d/%m/%Y')}"
    r = Report(tenant_id=tenant.id, title=title, content=content)
    db.add(r); db.commit(); db.refresh(r)
    return ReportOut.model_validate(r)
