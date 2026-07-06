"""add pending and rejected to mentorstatus enum

Revision ID: 1de75f5834f2
Revises: 1c5da7f0eb5c
Create Date: 2026-06-18 01:26:06.028218

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1de75f5834f2'
down_revision: Union[str, Sequence[str], None] = '1c5da7f0eb5c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE mentorstatus ADD VALUE IF NOT EXISTS 'PENDING'")
    op.execute("ALTER TYPE mentorstatus ADD VALUE IF NOT EXISTS 'REJECTED'")


def downgrade() -> None:
    """Downgrade schema."""
    pass
