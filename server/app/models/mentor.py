from sqlalchemy import String, Enum, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import MentorStatus


class Mentor(Base):
    __tablename__ = "mentors"

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        primary_key=True
    )

    status: Mapped[MentorStatus] = mapped_column(Enum(MentorStatus), default=MentorStatus.ACTIVE)

    linkedin_url: Mapped[str] = mapped_column(String, nullable=True)

    total_sessions: Mapped[int] = mapped_column(default=0)

    last_meeting_id: Mapped[int | None] = mapped_column(nullable=True)

    # relationship (optional but useful)
    user = relationship("User")