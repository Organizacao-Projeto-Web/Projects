from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext

# Configurações do JWT
SECRET_KEY = "sua_chave_secreta_super_segura_para_o_prontuario_eletronico"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # Token válido por 8 horas

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def gerar_hash_senha(senha: str) -> str:
    return pwd_context.hash(senha)


def verificar_senha(senha_plana: str, senha_hash: str) -> bool:
    return pwd_context.verify(senha_plana, senha_hash)


def criar_token_acesso(
    data: dict, expires_delta: Optional[timedelta] = None
) -> str:
    para_codificar = data.copy()
    if expires_delta:
        expira = datetime.utcnow() + expires_delta
    else:
        expira = datetime.utcnow() + timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        )

    para_codificar.update({"exp": expira})
    token_jwt = jwt.encode(para_codificar, SECRET_KEY, algorithm=ALGORITHM)
    return token_jwt