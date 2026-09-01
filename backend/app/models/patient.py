from datetime import datetime
from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class PacienteModel(Base):
    __tablename__ = "pacientes"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nome = Column(String(255), nullable=False)
    cpf = Column(String(14), unique=True, index=True, nullable=True)
    data_nascimento = Column(Date, nullable=True)
    telefone = Column(String(20), nullable=True)
    clinica_id = Column(Integer, ForeignKey("clinicas.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relacionamento para acessar os dados da clínica a partir do paciente
    clinica = relationship("ClinicaModel")