from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class PacienteBase(BaseModel):
    nome: str = Field(min_length=2, max_length=150)
    cpf: Optional[str] = Field(
        default=None,
        pattern=r"^\d{11}$",
    )
    data_nascimento: Optional[date] = None
    telefone: Optional[str] = Field(
        default=None,
        min_length=10,
        max_length=15,
        pattern=r"^\d+$",
    )


class PacienteCreate(PacienteBase):
    pass


class PacienteResponse(PacienteBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    clinica_id: int
    created_at: datetime