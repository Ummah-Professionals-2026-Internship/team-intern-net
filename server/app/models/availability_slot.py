from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import ForeignKey, Boolean, CheckConstraint, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


if TYPE_CHECKING:
    from .meeting import Meeting 
    from .mentor import Mentor

class AvailabilitySlot(Base):
    """
    Represents a time window a mentor has marked as available for meetings.
 
    Business rules:
    - end_datetime must be strictly greater than start_datetime, enforced by
      a CHECK constraint (chk_slot_valid_duration) at the DB level and a
      model_validator in the Pydantic schema at the API level
    - is_booked is set to TRUE atomically when a meeting is created against
      this slot — both operations happen in the same transaction
    - A slot can only back one meeting at a time, enforced by the unique
      constraint on meetings.slot_id
    - ondelete=CASCADE — if a mentor is deleted all their slots are removed
    """

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
