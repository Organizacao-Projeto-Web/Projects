"""Registros clínicos por módulo, separados por clínica e imutáveis via API."""
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, JSON, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class AvaliacaoClinicaModel(Base):
    __tablename__ = "avaliacoes_clinicas"
    __table_args__ = (
        Index("ix_avaliacoes_clinica_paciente_data", "clinica_id", "paciente_id", "created_at"),
        Index("ix_avaliacoes_clinica_modulo", "clinica_id", "modulo"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    clinica_id = Column(Integer, ForeignKey("clinicas.id"), nullable=False)
    paciente_id = Column(Integer, ForeignKey("pacientes.id"), nullable=False)
    profissional_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    consulta_id = Column(Integer, ForeignKey("consultas.id"), nullable=True)
    agendamento_id = Column(Integer, ForeignKey("agendamentos.id"), nullable=True)
    modulo = Column(String(32), nullable=False)
    tipo = Column(String(32), nullable=False)
    schema_versao = Column(Integer, nullable=False)
    dados = Column(JSON, nullable=False)
    status = Column(String(20), nullable=False, default="registrada")
    created_at = Column(DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    paciente = relationship("PacienteModel")
    clinica = relationship("ClinicaModel")
    profissional = relationship("UsuarioModel")
    consulta = relationship("ConsultaModel")
    agendamento = relationship("AgendamentoModel")
