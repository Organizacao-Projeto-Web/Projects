"""normalizar telefones de pacientes

Revision ID: 90e20b190025
Revises: 48bc5ac674e0
Create Date: 2026-10-07 12:47:50.460962

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "90e20b190025"
down_revision: Union[str, Sequence[str], None] = "48bc5ac674e0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Normaliza telefones legados de pacientes."""
    op.execute("""
        UPDATE pacientes
        SET telefone = REGEXP_REPLACE(telefone, '[^0-9]', '')
        WHERE telefone IS NOT NULL
        """)

    op.execute("""
        UPDATE pacientes
        SET telefone = NULL
        WHERE telefone IS NOT NULL
          AND (
              CHAR_LENGTH(telefone) < 10
              OR CHAR_LENGTH(telefone) > 15
          )
        """)


def downgrade() -> None:
    """A normalização de telefones não pode ser revertida com segurança."""
    pass
