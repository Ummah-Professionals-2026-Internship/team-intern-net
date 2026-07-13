from datetime import datetime

from sqlalchemy import (
    ForeignKey,
    DateTime,
    func,
    Enum as SAEnum,
)

from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

import enum


class RecommendationStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class MentorRecommendation(Base):

    __tablename__ = "mentor_recommendations"


    id: Mapped[int] = mapped_column(
        primary_key=True,
        autoincrement=True
    )


    student_user_id: Mapped[int] = mapped_column(
        ForeignKey(
            "students.user_id",
            ondelete="CASCADE"
        )
    )


    mentor_user_id: Mapped[int] = mapped_column(
        ForeignKey(
            "mentors.user_id",
            ondelete="CASCADE"
        )
    )


    match_score: Mapped[int] = mapped_column()


    status: Mapped[RecommendationStatus] = mapped_column(
        SAEnum(
            RecommendationStatus,
            name="recommendation_status"
        ),
        default=RecommendationStatus.pending
    )


    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now()
    )