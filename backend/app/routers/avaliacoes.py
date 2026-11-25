"""Registros de avaliações clínicas. Sem endpoints de alteração ou exclusão."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.dependencies import exigir_perfil_clinico
from app.models.appointment import AgendamentoModel
from app.models.clinical_assessment import AvaliacaoClinicaModel
from app.models.consultation import ConsultaModel
from app.models.patient import PacienteModel
from app.models.user import UsuarioModel
from app.schemas.clinical_assessment import (
    AvaliacaoCreate,
    AvaliacaoResponse,
    ModuloClinico,
)

router = APIRouter(prefix="/api", tags=["Avaliações clínicas"])


def _paciente_da_clinica(db: Session, paciente_id: int, usuario: UsuarioModel):
    paciente = (
        db.query(PacienteModel)
        .filter(PacienteModel.id == paciente_id, PacienteModel.clinica_id == usuario.clinica_id)
        .first()
    )
    if paciente is None:
        raise HTTPException(status_code=404, detail="Paciente não encontrado.")
    return paciente


@router.post(
    "/pacientes/{paciente_id}/avaliacoes",
    response_model=AvaliacaoResponse,
    status_code=status.HTTP_201_CREATED,
)
def criar_avaliacao(
    paciente_id: int,
    dados: AvaliacaoCreate,
    db: Session = Depends(get_db),
    usuario: UsuarioModel = Depends(exigir_perfil_clinico),
):
    _paciente_da_clinica(db, paciente_id, usuario)

    if dados.consulta_id is not None:
        consulta = db.query(ConsultaModel).filter(
            ConsultaModel.id == dados.consulta_id,
            ConsultaModel.paciente_id == paciente_id,
        ).first()
        if consulta is None:
            raise HTTPException(status_code=404, detail="Consulta não encontrada.")

    if dados.agendamento_id is not None:
        agendamento = db.query(AgendamentoModel).filter(
            AgendamentoModel.id == dados.agendamento_id,
            AgendamentoModel.paciente_id == paciente_id,
            AgendamentoModel.clinica_id == usuario.clinica_id,
        ).first()
        if agendamento is None:
            raise HTTPException(status_code=404, detail="Agendamento não encontrado.")
        if usuario.cargo == "fisioterapeuta" and agendamento.profissional_id != usuario.id:
            raise HTTPException(status_code=404, detail="Agendamento não encontrado.")
        if agendamento.status != "agendado":
            raise HTTPException(status_code=409, detail="O agendamento já foi concluído ou cancelado.")

    registro = AvaliacaoClinicaModel(
        clinica_id=usuario.clinica_id,
        paciente_id=paciente_id,
        profissional_id=usuario.id,
        consulta_id=dados.consulta_id,
        agendamento_id=dados.agendamento_id,
        modulo=dados.modulo,
        tipo=dados.tipo,
        schema_versao=dados.schema_versao,
        dados=dados.dados.model_dump(mode="json", by_alias=True),
        status="registrada",
    )
    try:
        db.add(registro)
        db.commit()
        db.refresh(registro)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Não foi possível registrar a avaliação.")
    return registro


@router.get(
    "/pacientes/{paciente_id}/avaliacoes",
    response_model=list[AvaliacaoResponse],
)
def listar_avaliacoes(
    paciente_id: int,
    modulo: ModuloClinico | None = None,
    db: Session = Depends(get_db),
    usuario: UsuarioModel = Depends(exigir_perfil_clinico),
):
    _paciente_da_clinica(db, paciente_id, usuario)
    query = db.query(AvaliacaoClinicaModel).filter(
        AvaliacaoClinicaModel.clinica_id == usuario.clinica_id,
        AvaliacaoClinicaModel.paciente_id == paciente_id,
    )
    if modulo is not None:
        query = query.filter(AvaliacaoClinicaModel.modulo == modulo)
    return query.order_by(
        AvaliacaoClinicaModel.created_at.desc(), AvaliacaoClinicaModel.id.desc()
    ).all()


@router.get("/avaliacoes/{avaliacao_id}", response_model=AvaliacaoResponse)
def detalhar_avaliacao(
    avaliacao_id: int,
    db: Session = Depends(get_db),
    usuario: UsuarioModel = Depends(exigir_perfil_clinico),
):
    registro = db.query(AvaliacaoClinicaModel).filter(
        AvaliacaoClinicaModel.id == avaliacao_id,
        AvaliacaoClinicaModel.clinica_id == usuario.clinica_id,
    ).first()
    if registro is None:
        raise HTTPException(status_code=404, detail="Avaliação não encontrada.")
    return registro


@router.get("/dashboard/avaliacoes-por-modulo")
def contagem_avaliacoes_por_modulo(
    db: Session = Depends(get_db),
    usuario: UsuarioModel = Depends(exigir_perfil_clinico),
):
    """Totais agregados por módulo da clínica; não expõe dados de pacientes."""
    from sqlalchemy import func

    totais = (
        db.query(AvaliacaoClinicaModel.modulo, func.count(AvaliacaoClinicaModel.id))
        .filter(AvaliacaoClinicaModel.clinica_id == usuario.clinica_id)
        .group_by(AvaliacaoClinicaModel.modulo)
        .all()
    )
    contagens = {modulo: total for modulo, total in totais}
    return [
        {"modulo": modulo, "total": contagens.get(modulo, 0)}
        for modulo in ("pelvica", "gestacao_posparto", "reabilitacao", "climaterio")
    ]
