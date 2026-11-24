from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.core.database import Base


class PasswordResetCodeModel(Base):
    __tablename__ = "password_reset_codes"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
        autoincrement=True,
    )

    usuario_id = Column(
        Integer,
        ForeignKey("usuarios.id"),
        nullable=False,
        index=True,
    )

    codigo_hash = Column(
        String(255),
        nullable=False,
    )

    expires_at = Column(
        DateTime,
        nullable=False,
    )

    tentativas = Column(
        Integer,
        default=0,
        nullable=False,
    )

    used_at = Column(
        DateTime,
        nullable=True,
    )

    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    usuario = relationship("UsuarioModel")
