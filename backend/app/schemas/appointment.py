from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

StatusAgendamento = Literal[
    "agendado",
    "realizado",
    "cancelado",
]


class AgendamentoCreate(BaseModel):
    paciente_id: int = Field(gt=0)
    profissional_id: int = Field(gt=0)

    data_hora: datetime

    duracao_minutos: int = Field(
        default=60,
        ge=15,
        le=240,
    )

    observacoes: Optional[str] = Field(
        default=None,
        max_length=1000,
    )


class AgendamentoStatusUpdate(BaseModel):
    status: StatusAgendamento


class AgendamentoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    paciente_id: int
    profissional_id: int
    clinica_id: int
    data_hora: datetime
    duracao_minutos: int
    status: StatusAgendamento
    observacoes: Optional[str]
    created_at: datetime
