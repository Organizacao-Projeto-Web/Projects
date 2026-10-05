from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.schemas.clinic import ClinicaResponse


class UsuarioBase(BaseModel):
    nome: str = Field(min_length=2, max_length=150)
    email: EmailStr
    crefito: Optional[str] = Field(
        default=None,
        min_length=3,
        max_length=30,
    )
    cargo: Literal[
        "fisioterapeuta",
        "admin",
        "recepcao",
    ] = "fisioterapeuta"


class UsuarioCreate(UsuarioBase):
    model_config = ConfigDict(extra="forbid")

    senha: str = Field(min_length=8, max_length=128)


class UsuarioResponse(UsuarioBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    clinica_id: int
    ativo: bool
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None


class ClinicaCadastro(BaseModel):
    nome: str = Field(min_length=2, max_length=150)
    cnpj: str = Field(pattern=r"^\d{14}$")


class ResponsavelCadastro(BaseModel):
    nome: str = Field(min_length=2, max_length=150)
    email: EmailStr
    senha: str = Field(min_length=8, max_length=128)
    crefito: Optional[str] = Field(
        default=None,
        min_length=3,
        max_length=30,
    )


class PrimeiroCadastro(BaseModel):
    model_config = ConfigDict(extra="forbid")

    clinica: ClinicaCadastro
    responsavel: ResponsavelCadastro


class PrimeiroCadastroResponse(BaseModel):
    clinica: ClinicaResponse
    responsavel: UsuarioResponse