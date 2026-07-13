"""add tag system tables

Revision ID: 66afa388df24
Revises: 0950f15360cb
Create Date: 2026-07-09 11:09:58.843274

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '66afa388df24'
down_revision: Union[str, Sequence[str], None] = '0950f15360cb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""

    # Main tag table
    op.create_table(
        "tags",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("category", sa.String(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(),
            server_default=sa.func.now(),
            nullable=False
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "name",
            "category",
            name="uq_tag_name_category"
        )
    )


    # Student -> Tag association table
    op.create_table(
        "student_tags",
        sa.Column(
            "student_user_id",
            sa.Integer(),
            nullable=False
        ),
        sa.Column(
            "tag_id",
            sa.Integer(),
            nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["student_user_id"],
            ["students.user_id"],
            ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["tag_id"],
            ["tags.id"],
            ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint(
            "student_user_id",
            "tag_id"
        )
    )


    # Mentor -> Tag association table
    op.create_table(
        "mentor_tags",
        sa.Column(
            "mentor_user_id",
            sa.Integer(),
            nullable=False
        ),
        sa.Column(
            "tag_id",
            sa.Integer(),
            nullable=False
        ),
        sa.ForeignKeyConstraint(
            ["mentor_user_id"],
            ["mentors.user_id"],
            ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["tag_id"],
            ["tags.id"],
            ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint(
            "mentor_user_id",
            "tag_id"
        )
    )


def downgrade() -> None:
    """Downgrade schema."""

    op.drop_table("mentor_tags")
    op.drop_table("student_tags")
    op.drop_table("tags")