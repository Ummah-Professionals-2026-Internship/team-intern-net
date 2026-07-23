from datetime import datetime
import enum
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, Enum as SAEnum, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from .student import Student
    from .mentor import Mentor


class RecommendationStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class MentorRecommendation(Base):
    __tablename__ = "mentor_recommendations"

    id              : Mapped[int]                  = mapped_column(primary_key=True, autoincrement=True)

    #Student receiving recommendations:
    student_user_id : Mapped[int]                  = mapped_column(ForeignKey("students.user_id", ondelete="CASCADE"), index=True) 

    #Mentor recommendation:
    mentor_user_id  : Mapped[int]                  = mapped_column(ForeignKey("mentors.user_id", ondelete="CASCADE"), index=True)

    #Matching score & admin decision:
    score           : Mapped[int]                  = mapped_column(Integer, nullable=False)
    status          : Mapped[RecommendationStatus] = mapped_column(SAEnum(RecommendationStatus, name="recommendation_status_enum"), default=RecommendationStatus.pending)

    created_at      : Mapped[datetime]             = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    student         : Mapped["Student"]            = relationship(foreign_keys=[student_user_id])
    mentor          : Mapped["Mentor"]             = relationship(foreign_keys=[mentor_user_id])