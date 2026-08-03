"""change default mentor_assignment status to pending

Revision ID: 994874430409
Revises: 19cfd2b6a263
Create Date: 2026-07-28 19:02:52.112080

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '994874430409'
down_revision: Union[str, Sequence[str], None] = '19cfd2b6a263'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("""
        ALTER TABLE mentor_assignments
        ALTER COLUMN status SET DEFAULT 'pending';
    """)
    pass


def downgrade() -> None:
    op.execute("""
        ALTER TABLE mentor_assignments
        ALTER COLUMN status SET DEFAULT 'active';
    """)    
    pass
