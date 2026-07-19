from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from .mentor import Mentor
    from .tag import Tag


class MentorTag(Base):
    __tablename__ = "mentor_tags"

    mentor_user_id: Mapped[int] = mapped_column(
        ForeignKey("mentors.user_id", ondelete="CASCADE"),
        primary_key=True
    )

    tag_id: Mapped[int] = mapped_column(
        ForeignKey("tags.id", ondelete="CASCADE"),
        primary_key=True
    )

    # Relationships
    mentor: Mapped["Mentor"] = relationship(
        back_populates="tag_links"
    )

    tag: Mapped["Tag"] = relationship(
        back_populates="mentor_links"
    )