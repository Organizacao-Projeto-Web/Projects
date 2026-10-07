"""normalizar cargo medico para fisioterapeuta

Revision ID: 48bc5ac674e0
Revises: 6b24004b07bd
Create Date: 2026-10-07 12:39:11.675959

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "48bc5ac674e0"
down_revision: Union[str, Sequence[str], None] = "6b24004b07bd"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Normaliza o cargo legado medico para fisioterapeuta."""
    op.execute(
        "UPDATE usuarios " "SET cargo = 'fisioterapeuta' " "WHERE cargo = 'medico'"
    )


def downgrade() -> None:
    """A normalização de dados não pode ser revertida com segurança."""
    pass
