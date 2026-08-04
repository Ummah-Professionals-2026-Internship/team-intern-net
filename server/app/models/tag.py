from datetime import datetime
from typing import TYPE_CHECKING, List

from sqlalchemy import String, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from .student_tag import StudentTag
    from .mentor_tag import MentorTag


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100),unique=True,index=True)
    category: Mapped[str] = mapped_column(String(50),index=True) #Examples: "major", "career", etc
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True),server_default=func.now())

    # Relationships
    student_links: Mapped[List["StudentTag"]] = relationship(back_populates="tag",cascade="all, delete-orphan")
    mentor_links: Mapped[List["MentorTag"]] = relationship(back_populates="tag",cascade="all, delete-orphan")
