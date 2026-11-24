"""Restaurar referencia historica de migracao.

Revision ID: e707834943b9
Revises: e30ac3d66474
"""

revision = "e707834943b9"
down_revision = "e30ac3d66474"
branch_labels = None
depends_on = None


def upgrade():
    # Revisao historica. A tabela agendamentos
    # tambem e criada pela migracao 6b24004b07bd.
    pass


def downgrade():
    pass