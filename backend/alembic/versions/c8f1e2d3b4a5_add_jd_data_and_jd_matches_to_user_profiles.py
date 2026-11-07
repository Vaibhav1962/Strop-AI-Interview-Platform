"""add jd_data and jd_matches to user_profiles

Revision ID: c8f1e2d3b4a5
Revises: b7e2f1c8a943
Create Date: 2026-11-02 00:15:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'c8f1e2d3b4a5'
down_revision = 'b7e2f1c8a943'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Use raw SQL or op.add_column with check
    conn = op.get_bind()
    conn.execute(sa.text("ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS jd_data JSONB;"))
    conn.execute(sa.text("ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS jd_matches JSONB;"))


def downgrade() -> None:
    op.drop_column('user_profiles', 'jd_matches')
    op.drop_column('user_profiles', 'jd_data')

