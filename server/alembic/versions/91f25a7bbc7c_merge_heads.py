"""merge heads

Revision ID: 91f25a7bbc7c
Revises: 66afa388df24, f0717e4fb97a
Create Date: 2026-07-16 11:45:04.003046

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '91f25a7bbc7c'
down_revision: Union[str, Sequence[str], None] = ('66afa388df24', 'f0717e4fb97a')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
