"""add industry and referral_source

Revision ID: 35a201836a79
Revises: 8f39d07357ac
Create Date: 2026-07-29 04:15:13.479960

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '35a201836a79'
down_revision: Union[str, Sequence[str], None] = '8f39d07357ac'  # <-- Explicitly linked after teammate's head
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('student_intake_forms')]
    if 'industry' not in columns:
        op.add_column('student_intake_forms', sa.Column('industry', sa.String(length=100), nullable=True))
    if 'referral_source' not in columns:
        op.add_column('student_intake_forms', sa.Column('referral_source', sa.String(length=100), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('student_intake_forms')]
    if 'referral_source' in columns:
        op.drop_column('student_intake_forms', 'referral_source')
    if 'industry' in columns:
        op.drop_column('student_intake_forms', 'industry')
