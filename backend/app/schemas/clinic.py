from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ClinicaBase(BaseModel):
    nome: str = Field(min_length=2, max_length=150)
    cnpj: str = Field(pattern=r"^\d{14}$")


class ClinicaCreate(ClinicaBase):
    pass


class ClinicaResponse(ClinicaBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime