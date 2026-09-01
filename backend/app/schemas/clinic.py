from datetime import datetime
from typing import Optional
from pydantic import BaseModel


# Dados comuns para Clínica
class ClinicaBase(BaseModel):
    nome: str
    cnpj: Optional[str] = None


# Schema recebido no POST (envio de dados para criar)
class ClinicaCreate(ClinicaBase):
    pass


# Schema retornado nas respostas (saída)
class ClinicaResponse(ClinicaBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True