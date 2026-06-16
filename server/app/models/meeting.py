from sqlalchemy import ForeignKey, Date, Time, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Meeting(Base):
    __tablename__ = "meetings"

    id: Mapped[int] = mapped_column(primary_key=True)

    mentor_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    student_id: Mapped[int] = mapped_column(ForeignKey("users.id"))

    meeting_date: Mapped[str] = mapped_column(Date)
    start_time: Mapped[str] = mapped_column(Time)

    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())

    mentor = relationship("User", foreign_keys=[mentor_id])
    student = relationship("User", foreign_keys=[student_id])