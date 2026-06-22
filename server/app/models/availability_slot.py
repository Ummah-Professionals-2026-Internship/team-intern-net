from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import ForeignKey, Boolean, CheckConstraint, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


if TYPE_CHECKING:
    from .meeting import Meeting 
    from .mentor import Mentor

class AvailabilitySlot(Base):
    __tablename__ = "availability_slots"

    id             : Mapped[int]      = mapped_column(primary_key=True, autoincrement=True)
    mentor_id      : Mapped[int]      = mapped_column(ForeignKey("mentors.user_id", ondelete="CASCADE"), index=True)
    start_datetime : Mapped[datetime] = mapped_column()
    end_datetime   : Mapped[datetime] = mapped_column()
    is_booked      : Mapped[bool]     = mapped_column(Boolean, default=False)
    created_at     : Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    mentor  : Mapped["Mentor"]           = relationship(back_populates="slots")
    meeting : Mapped[Optional["Meeting"]] = relationship(back_populates="slot", uselist=False)

    __table_args__ = (
        CheckConstraint("end_datetime > start_datetime", name="chk_slot_valid_duration"),
    )
