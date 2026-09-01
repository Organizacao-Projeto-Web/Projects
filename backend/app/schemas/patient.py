from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel


class PacienteBase(BaseModel):
    nome: str
    cpf: Optional[str] = None
    data_nascimento: Optional[date] = None
    telefone: Optional[str] = None
    clinica_id: int


class PacienteCreate(PacienteBase):
    pass


class PacienteResponse(PacienteBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True