from pydantic import BaseModel, ConfigDict, EmailStr, Field


class SolicitarRecuperacaoSenhaRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr


class MensagemRecuperacaoResponse(BaseModel):
    mensagem: str


class VerificarCodigoRecuperacaoRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    codigo: str = Field(
        min_length=6,
        max_length=6,
        pattern=r"^\d{6}$",
    )


class TokenRedefinicaoSenhaResponse(BaseModel):
    reset_token: str
