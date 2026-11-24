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


class RedefinirSenhaRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    reset_token: str = Field(
        min_length=20,
    )

    nova_senha: str = Field(
        min_length=8,
        max_length=128,
    )
