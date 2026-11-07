"""add_metadata_json_and_question_family

Revision ID: f6a7b8c9d0e1
Revises: 1aa291e01076
Create Date: 2026-11-05 15:45:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'f6a7b8c9d0e1'
down_revision = '1aa291e01076'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('questions', sa.Column('metadata_json', postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False))
    op.add_column('questions', sa.Column('source_attribution', sa.String(length=255), nullable=True))
    op.add_column('questions', sa.Column('question_family', sa.String(length=100), nullable=True))
    op.add_column('questions', sa.Column('version', sa.Integer(), server_default='1', nullable=False))
    op.create_index(op.f('ix_questions_question_family'), 'questions', ['question_family'], unique=False)
    op.create_index(op.f('ix_questions_difficulty'), 'questions', ['difficulty'], unique=False)
    op.create_index(op.f('ix_questions_validation_status'), 'questions', ['validation_status'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_questions_validation_status'), table_name='questions')
    op.drop_index(op.f('ix_questions_difficulty'), table_name='questions')
    op.drop_index(op.f('ix_questions_question_family'), table_name='questions')
    op.drop_column('questions', 'version')
    op.drop_column('questions', 'question_family')
    op.drop_column('questions', 'source_attribution')
    op.drop_column('questions', 'metadata_json')

