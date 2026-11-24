from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class AgendamentoModel(Base):
    __tablename__ = "agendamentos"
    __table_args__ = (
        Index(
            "ix_agendamentos_clinica_data_hora",
            "clinica_id",
            "data_hora",
        ),
        Index(
            "ix_agendamentos_profissional_data_hora",
            "profissional_id",
            "data_hora",
        ),
    )

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)

    paciente_id = Column(
        Integer,
        ForeignKey("pacientes.id"),
        nullable=False,
    )

    profissional_id = Column(
        Integer,
        ForeignKey("usuarios.id"),
        nullable=False,
    )

    clinica_id = Column(
        Integer,
        ForeignKey("clinicas.id"),
        nullable=False,
    )

    data_hora = Column(
        DateTime,
        nullable=False,
    )

    duracao_minutos = Column(
        Integer,
        nullable=False,
        default=60,
    )

    status = Column(
        String(20),
        nullable=False,
        default="agendado",
    )

    observacoes = Column(
        Text,
        nullable=True,
    )

    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
    )

    paciente = relationship("PacienteModel")
    profissional = relationship("UsuarioModel")
    clinica = relationship("ClinicaModel")
