"""Dependências de autenticação e autorização compartilhadas pelos routers."""
import jwt
from jose import JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import ALGORITHM, SECRET_KEY
from app.models.user import UsuarioModel

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def obter_usuario_atual(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> UsuarioModel:
    credenciais_invalidas = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Não foi possível validar as credenciais",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if not isinstance(email, str) or not email:
            raise credenciais_invalidas
    except (JWTError, jwt.PyJWTError):
        raise credenciais_invalidas

    usuario = db.query(UsuarioModel).filter(UsuarioModel.email == email).first()
    if usuario is None or not usuario.ativo:
        raise credenciais_invalidas
    return usuario


def exigir_perfil_clinico(
    usuario_atual: UsuarioModel = Depends(obter_usuario_atual),
) -> UsuarioModel:
    if usuario_atual.cargo not in ("admin", "fisioterapeuta"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso restrito aos profissionais autorizados.",
        )
    return usuario_atual
