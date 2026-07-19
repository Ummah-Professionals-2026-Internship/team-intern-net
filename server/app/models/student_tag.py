from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from .student import Student
    from .tag import Tag


class StudentTag(Base):
    __tablename__ = "student_tags"

    student_user_id: Mapped[int] = mapped_column(
        ForeignKey("students.user_id", ondelete="CASCADE"),
        primary_key=True
    )

    tag_id: Mapped[int] = mapped_column(
        ForeignKey("tags.id", ondelete="CASCADE"),
        primary_key=True
    )

    # Relationships
    student: Mapped["Student"] = relationship(
        back_populates="tag_links"
    )

    tag: Mapped["Tag"] = relationship(
        back_populates="student_links"
    )