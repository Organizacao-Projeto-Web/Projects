"""unificar historicos dev e agendamentos

Revision ID: 9a0ee0f57d5b
Revises: d8139ff3117a, e707834943b9
Create Date: 2026-11-24 09:52:58.798212

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9a0ee0f57d5b'
down_revision: Union[str, Sequence[str], None] = ('d8139ff3117a', 'e707834943b9')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
