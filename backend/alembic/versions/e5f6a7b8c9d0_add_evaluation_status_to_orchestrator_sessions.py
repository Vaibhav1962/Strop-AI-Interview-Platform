"""add evaluation_status and evaluation_error to orchestrator_sessions

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-11-03 00:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e5f6a7b8c9d0'
down_revision = 'd4e5f6a7b8c9'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'orchestrator_sessions',
        sa.Column('evaluation_status', sa.String(length=30), nullable=False, server_default='idle')
    )
    op.add_column(
        'orchestrator_sessions',
        sa.Column('evaluation_error', sa.String(length=500), nullable=True)
    )
    op.create_index(
        'ix_orchestrator_sessions_eval_status',
        'orchestrator_sessions',
        ['evaluation_status'],
        unique=False
    )


def downgrade() -> None:
    op.drop_index('ix_orchestrator_sessions_eval_status', table_name='orchestrator_sessions')
    op.drop_column('orchestrator_sessions', 'evaluation_error')
    op.drop_column('orchestrator_sessions', 'evaluation_status')

