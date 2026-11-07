"""add session scores metrics and user_profiles table

Revision ID: b7e2f1c8a943
Revises: a3f9c1d2e4b7
Create Date: 2026-11-01 12:45:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'b7e2f1c8a943'
down_revision = 'a3f9c1d2e4b7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add score and analytical telemetry columns to interview_sessions
    op.add_column('interview_sessions', sa.Column('track', sa.String(length=100), nullable=True))
    op.add_column('interview_sessions', sa.Column('overall_score', sa.Integer(), nullable=True))
    op.add_column('interview_sessions', sa.Column('competency_level', sa.String(length=50), nullable=True))
    op.add_column('interview_sessions', sa.Column('metrics', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column('interview_sessions', sa.Column('strengths', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column('interview_sessions', sa.Column('weaknesses', postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column('interview_sessions', sa.Column('report', postgresql.JSONB(astext_type=sa.Text()), nullable=True))

    # 2. Create user_profiles table for persistent resume & target role data
    op.create_table(
        'user_profiles',
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('resume_data', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('target_role', sa.String(length=255), nullable=True),
        sa.Column('target_company', sa.String(length=255), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('user_id')
    )


def downgrade() -> None:
    op.drop_table('user_profiles')
    op.drop_column('interview_sessions', 'report')
    op.drop_column('interview_sessions', 'weaknesses')
    op.drop_column('interview_sessions', 'strengths')
    op.drop_column('interview_sessions', 'metrics')
    op.drop_column('interview_sessions', 'competency_level')
    op.drop_column('interview_sessions', 'overall_score')
    op.drop_column('interview_sessions', 'track')

