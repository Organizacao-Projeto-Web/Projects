from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class UsuarioModel(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nome = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    senha_hash = Column(String(255), nullable=False)
    crefito = Column(String(20), nullable=True)
    cargo = Column(String(50), default="medico")  # medico, recepcao, admin
    ativo = Column(Boolean, default=True)
    clinica_id = Column(Integer, ForeignKey("clinicas.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    clinica = relationship("ClinicaModel")