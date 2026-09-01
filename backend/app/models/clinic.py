from datetime import datetime
from sqlalchemy import Column, DateTime, Integer, String
from app.core.database import Base


class ClinicaModel(Base):
    __tablename__ = "clinicas"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    nome = Column(String(255), nullable=False)
    cnpj = Column(String(18), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)