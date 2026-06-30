"""add_healthcare_mentorship_to_service_type_enum

Revision ID: d520093bf2a9
Revises: 11b568adb628
Create Date: 2026-06-30 18:04:05.853972

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd520093bf2a9'
down_revision: Union[str, Sequence[str], None] = '11b568adb628'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("COMMIT")
    op.execute("ALTER TYPE service_type_enum ADD VALUE IF NOT EXISTS 'healthcare_service'")
    op.execute("ALTER TYPE service_type_enum ADD VALUE IF NOT EXISTS 'mentorship_program'")

def downgrade() -> None:
    pass