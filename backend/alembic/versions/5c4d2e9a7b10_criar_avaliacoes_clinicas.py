"""Criar registros de avaliações clínicas, com isolamento por clínica.

Revision ID: 5c4d2e9a7b10
Revises: 9a0ee0f57d5b
"""
from alembic import op
import sqlalchemy as sa

revision = "5c4d2e9a7b10"
down_revision = "9a0ee0f57d5b"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "avaliacoes_clinicas",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("clinica_id", sa.Integer(), nullable=False),
        sa.Column("paciente_id", sa.Integer(), nullable=False),
        sa.Column("profissional_id", sa.Integer(), nullable=False),
        sa.Column("consulta_id", sa.Integer(), nullable=True),
        sa.Column("agendamento_id", sa.Integer(), nullable=True),
        sa.Column("modulo", sa.String(length=32), nullable=False),
        sa.Column("tipo", sa.String(length=32), nullable=False),
        sa.Column("schema_versao", sa.Integer(), nullable=False),
        sa.Column("dados", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["clinica_id"], ["clinicas.id"]),
        sa.ForeignKeyConstraint(["paciente_id"], ["pacientes.id"]),
        sa.ForeignKeyConstraint(["profissional_id"], ["usuarios.id"]),
        sa.ForeignKeyConstraint(["consulta_id"], ["consultas.id"]),
        sa.ForeignKeyConstraint(["agendamento_id"], ["agendamentos.id"]),
    )
    op.create_index(
        "ix_avaliacoes_clinica_paciente_data",
        "avaliacoes_clinicas",
        ["clinica_id", "paciente_id", "created_at"],
    )
    op.create_index(
        "ix_avaliacoes_clinica_modulo",
        "avaliacoes_clinicas",
        ["clinica_id", "modulo"],
    )


def downgrade():
    op.drop_index("ix_avaliacoes_clinica_modulo", table_name="avaliacoes_clinicas")
    op.drop_index("ix_avaliacoes_clinica_paciente_data", table_name="avaliacoes_clinicas")
    op.drop_table("avaliacoes_clinicas")
