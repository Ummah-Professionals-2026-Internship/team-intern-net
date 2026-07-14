"""added_pending_declined_to_assignment_status_enum and updated default status value to pending

Revision ID: f0717e4fb97a
Revises: 8ac6450a71d6
Create Date: 2026-07-13 23:31:15.462341

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f0717e4fb97a'
down_revision: Union[str, Sequence[str], None] = '8ac6450a71d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("COMMIT")
    op.execute("ALTER TYPE assignment_status_enum ADD VALUE IF NOT EXISTS 'pending'")
    op.execute("ALTER TYPE assignment_status_enum ADD VALUE IF NOT EXISTS 'declined'")

def downgrade() -> None:
    pass