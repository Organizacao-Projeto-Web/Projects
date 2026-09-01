from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr


class UsuarioBase(BaseModel):
    nome: str
    email: EmailStr
    crefito: Optional[str] = None
    cargo: Optional[str] = "medico"
    clinica_id: int


class UsuarioCreate(UsuarioBase):
    senha: str


class UsuarioResponse(UsuarioBase):
    id: int
    ativo: bool
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None