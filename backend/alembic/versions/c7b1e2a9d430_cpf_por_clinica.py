"""Unicidade do CPF por clinica.

Revision ID: c7b1e2a9d430
Revises: 5c4d2e9a7b10
"""
from alembic import op

revision = "c7b1e2a9d430"
down_revision = "5c4d2e9a7b10"
branch_labels = None
depends_on = None


def upgrade():
    op.drop_index("ix_pacientes_cpf", table_name="pacientes")
    op.create_unique_constraint("uq_pacientes_clinica_cpf", "pacientes", ["clinica_id", "cpf"])


def downgrade():
    # Pode falhar se ja houver mesmo CPF em clinicas diferentes.
    op.drop_constraint("uq_pacientes_clinica_cpf", "pacientes", type_="unique")
    op.create_index("ix_pacientes_cpf", "pacientes", ["cpf"], unique=True)
