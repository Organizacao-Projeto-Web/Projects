from pydantic import BaseModel, ConfigDict, EmailStr


class SolicitarRecuperacaoSenhaRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    email: EmailStr


class MensagemRecuperacaoResponse(BaseModel):
    mensagem: str
