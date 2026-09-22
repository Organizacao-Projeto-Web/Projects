import jwt
import bcrypt
from datetime import datetime, timedelta, timezone
from typing import Optional

# Configurações do JWT
SECRET_KEY = "sua_chave_secreta_super_segura_para_o_prontuario_eletronico"
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


def criar_token_acesso(
    data: dict, expires_delta: Optional[timedelta] = None
) -> str:
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