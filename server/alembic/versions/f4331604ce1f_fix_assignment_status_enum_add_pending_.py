"""fix_assignment_status_enum_add_pending_declined

Revision ID: f4331604ce1f
Revises: cd5c4ddb5e60
Create Date: 2026-08-04 00:15:34.294003

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f4331604ce1f'
down_revision: Union[str, Sequence[str], None] = 'cd5c4ddb5e60'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Add 'pending' and 'declined' to assignment_status_enum.

    ALTER TYPE ... ADD VALUE cannot run inside a transaction block,
    so we must COMMIT first. The IF NOT EXISTS guard makes this
    idempotent — safe to re-run even if already partially applied.
    """
    op.execute("COMMIT")
    op.execute("ALTER TYPE assignment_status_enum ADD VALUE IF NOT EXISTS 'pending'")
    op.execute("ALTER TYPE assignment_status_enum ADD VALUE IF NOT EXISTS 'declined'")


def downgrade() -> None:
    # PostgreSQL does not support removing enum values — no-op intentionally.
    pass
