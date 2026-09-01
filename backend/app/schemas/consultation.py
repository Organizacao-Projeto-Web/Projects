from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class ConsultaBase(BaseModel):
    paciente_id: int
    queixa_principal: str
    diagnostico: Optional[str] = None
    prescricao: Optional[str] = None
    observacoes: Optional[str] = None


class ConsultaCreate(ConsultaBase):
    pass


class ConsultaResponse(ConsultaBase):
    id: int
    medico_id: int
    created_at: datetime

    class Config:
        from_attributes = True