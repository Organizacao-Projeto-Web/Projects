from datetime import datetime
from sqlalchemy import Column, DateTime, ForeignKey, Integer, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class ConsultaModel(Base):
    __tablename__ = "consultas"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    paciente_id = Column(Integer, ForeignKey("pacientes.id"), nullable=False)
    medico_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    queixa_principal = Column(Text, nullable=False)
    diagnostico = Column(Text, nullable=True)
    prescricao = Column(Text, nullable=True)
    observacoes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    paciente = relationship("PacienteModel")
    medico = relationship("UsuarioModel")