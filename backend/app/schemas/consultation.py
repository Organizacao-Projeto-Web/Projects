from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ConsultaBase(BaseModel):
    paciente_id: int
    queixa_principal: str
    diagnostico: Optional[str] = None
    prescricao: Optional[str] = None
    observacoes: Optional[str] = None


class ConsultaCreate(ConsultaBase):
    pass


class ConsultaResponse(ConsultaBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    medico_id: int
    created_at: datetime