"""schema inicial do banco

Revision ID: f31a7fbf3e90
Revises:
Create Date: 2026-10-06 12:19:10.388840
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "f31a7fbf3e90"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "clinicas",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("nome", sa.String(length=255), nullable=False),
        sa.Column("cnpj", sa.String(length=14), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("cnpj", name="uq_clinicas_cnpj"),
    )

    op.create_index(
        "ix_clinicas_id",
        "clinicas",
        ["id"],
        unique=False,
    )

    op.create_table(
        "usuarios",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("nome", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("senha_hash", sa.String(length=255), nullable=False),
        sa.Column("crefito", sa.String(length=20), nullable=True),
        sa.Column("cargo", sa.String(length=50), nullable=True),
        sa.Column("ativo", sa.Boolean(), nullable=True),
        sa.Column("clinica_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ["clinica_id"],
            ["clinicas.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_usuarios_id",
        "usuarios",
        ["id"],
        unique=False,
    )

    op.create_index(
        "ix_usuarios_email",
        "usuarios",
        ["email"],
        unique=True,
    )

    op.create_table(
        "pacientes",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("nome", sa.String(length=255), nullable=False),
        sa.Column("cpf", sa.String(length=14), nullable=True),
        sa.Column("data_nascimento", sa.Date(), nullable=True),
        sa.Column("telefone", sa.String(length=20), nullable=True),
        sa.Column("clinica_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ["clinica_id"],
            ["clinicas.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_pacientes_id",
        "pacientes",
        ["id"],
        unique=False,
    )

    op.create_index(
        "ix_pacientes_cpf",
        "pacientes",
        ["cpf"],
        unique=True,
    )

    op.create_table(
        "consultas",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("paciente_id", sa.Integer(), nullable=False),
        sa.Column("medico_id", sa.Integer(), nullable=False),
        sa.Column("queixa_principal", sa.Text(), nullable=False),
        sa.Column("diagnostico", sa.Text(), nullable=True),
        sa.Column("prescricao", sa.Text(), nullable=True),
        sa.Column("observacoes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ["medico_id"],
            ["usuarios.id"],
        ),
        sa.ForeignKeyConstraint(
            ["paciente_id"],
            ["pacientes.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        "ix_consultas_id",
        "consultas",
        ["id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_consultas_id", table_name="consultas")
    op.drop_table("consultas")

    op.drop_index("ix_pacientes_cpf", table_name="pacientes")
    op.drop_index("ix_pacientes_id", table_name="pacientes")
    op.drop_table("pacientes")

    op.drop_index("ix_usuarios_email", table_name="usuarios")
    op.drop_index("ix_usuarios_id", table_name="usuarios")
    op.drop_table("usuarios")

    op.drop_index("ix_clinicas_id", table_name="clinicas")
    op.drop_table("clinicas")
