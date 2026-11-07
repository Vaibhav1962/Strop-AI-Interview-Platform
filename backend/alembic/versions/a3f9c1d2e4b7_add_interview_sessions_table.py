"""add interview_sessions table

Revision ID: a3f9c1d2e4b7
Revises: dd1dc2cb8659
Create Date: 2026-09-21 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = 'a3f9c1d2e4b7'
down_revision = 'dd1dc2cb8659'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('interview_sessions',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('title', sa.String(length=255), nullable=False),
    sa.Column('question_count', sa.Integer(), nullable=False),
    sa.Column('duration_seconds', sa.Integer(), nullable=False),
    sa.Column('transcript', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_interview_sessions_user_id'), 'interview_sessions', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_interview_sessions_user_id'), table_name='interview_sessions')
    op.drop_table('interview_sessions')
