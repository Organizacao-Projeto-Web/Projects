from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class ConsultaBase(BaseModel):
    paciente_id: int
    queixa_principal: str
    diagnostico: Optional[str] = None
    prescricao: Optional[str] = None
    observacoes: Optional[str] = None
    dor_atual: Optional[int] = Field(default=None, ge=0, le=10)
    percepcao_paciente: Optional[Literal["melhorou", "igual", "piorou"]] = None


class ConsultaCreate(ConsultaBase):
    pass


class ConsultaResponse(ConsultaBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    medico_id: int
    created_at: datetime


class AcompanhamentoClinicoResponse(BaseModel):
    paciente_id: int
    paciente_nome: str

    dor_atual: Optional[int] = None
    dor_anterior: Optional[int] = None

    percepcao_paciente: Optional[Literal["melhorou", "igual", "piorou"]] = None

    sessoes_sem_melhora: int = 0

    ultima_sessao: datetime
