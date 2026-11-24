import os
from datetime import datetime, timedelta, timezone
import secrets
from typing import Optional

import bcrypt
import jwt
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")

if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY não configurada nas variáveis de ambiente.")

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # Token válido por 8 horas


def gerar_hash_senha(senha: str) -> str:
    """Gera o hash da senha utilizando bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(senha.encode("utf-8"), salt).decode("utf-8")


def verificar_senha(senha_plana: str, senha_hash: str) -> bool:
    """Verifica se a senha fornecida corresponde ao hash guardado."""
    return bcrypt.checkpw(senha_plana.encode("utf-8"), senha_hash.encode("utf-8"))


verify_password = verificar_senha


def gerar_codigo_recuperacao() -> str:
    """Gera um código seguro de recuperação com 6 dígitos."""
    return str(secrets.randbelow(900000) + 100000)


def gerar_hash_codigo_recuperacao(codigo: str) -> str:
    """Gera o hash bcrypt do código de recuperação."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(
        codigo.encode("utf-8"),
        salt,
    ).decode("utf-8")


def verificar_codigo_recuperacao(
    codigo: str,
    codigo_hash: str,
) -> bool:
    """Verifica se o código informado corresponde ao hash salvo."""
    return bcrypt.checkpw(
        codigo.encode("utf-8"),
        codigo_hash.encode("utf-8"),
    )


def criar_token_acesso(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Cria um token JWT com tempo de expiração definido."""
    para_codificar = data.copy()

    agora = datetime.now(timezone.utc)
    if expires_delta:
        expira = agora + expires_delta
    else:
        expira = agora + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    para_codificar.update({"exp": expira})
    token_jwt = jwt.encode(para_codificar, SECRET_KEY, algorithm=ALGORITHM)
    return token_jwt
