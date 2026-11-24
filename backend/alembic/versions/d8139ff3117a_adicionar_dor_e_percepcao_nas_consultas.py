"""adicionar dor e percepcao nas consultas

Revision ID: d8139ff3117a
Revises: 90e20b190025
Create Date: 2026-10-13 12:34:31.973535

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "d8139ff3117a"
down_revision: Union[str, Sequence[str], None] = "90e20b190025"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "consultas",
        sa.Column("dor_atual", sa.Integer(), nullable=True),
    )

    op.add_column(
        "consultas",
        sa.Column(
            "percepcao_paciente",
            sa.String(length=20),
            nullable=True,
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("consultas", "percepcao_paciente")
    op.drop_column("consultas", "dor_atual")
