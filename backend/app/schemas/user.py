from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr

from app.schemas.clinic import ClinicaResponse


class UsuarioBase(BaseModel):
    nome: str
    email: EmailStr
    crefito: Optional[str] = None
    cargo: Literal["fisioterapeuta", "admin", "recepcao"] = "fisioterapeuta"

class UsuarioCreate(UsuarioBase):
    model_config = ConfigDict(extra="forbid")
    senha: str

class UsuarioResponse(UsuarioBase):
    id: int
    clinica_id: int
    ativo: bool
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class ClinicaCadastro(BaseModel):
    nome: str
    cnpj: Optional[str] = None


class ResponsavelCadastro(BaseModel):
    nome: str
    email: EmailStr
    senha: str
    crefito: Optional[str] = None


class PrimeiroCadastro(BaseModel):
    clinica: ClinicaCadastro
    responsavel: ResponsavelCadastro


class PrimeiroCadastroResponse(BaseModel):
    clinica: ClinicaResponse
    responsavel: UsuarioResponse