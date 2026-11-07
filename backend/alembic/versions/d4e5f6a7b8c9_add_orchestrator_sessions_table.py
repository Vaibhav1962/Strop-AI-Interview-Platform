"""add orchestrator_sessions table

Revision ID: d4e5f6a7b8c9
Revises: c8f1e2d3b4a5
Create Date: 2026-11-02 18:55:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'd4e5f6a7b8c9'
down_revision = 'c8f1e2d3b4a5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'orchestrator_sessions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            'user_id',
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey('users.id', ondelete='CASCADE'),
            nullable=False,
        ),
        sa.Column('title', sa.String(length=255), nullable=False, server_default='Technical Calibration Round'),
        sa.Column('track', sa.String(length=100), nullable=False, server_default='System Design'),
        sa.Column('status', sa.String(length=30), nullable=False, server_default='in_progress'),
        sa.Column('turn_index', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('fencing_token', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('in_flight_turn_id', sa.String(length=64), nullable=True),
        sa.Column('in_flight_payload_hash', sa.String(length=64), nullable=True),
        sa.Column('in_flight_expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('idempotency_keys', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column('working_memory', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column('transcript', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(
        'ix_orchestrator_sessions_user_id',
        'orchestrator_sessions',
        ['user_id', sa.text('created_at DESC')],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index('ix_orchestrator_sessions_user_id', table_name='orchestrator_sessions')
    op.drop_table('orchestrator_sessions')

