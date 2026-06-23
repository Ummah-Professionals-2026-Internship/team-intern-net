from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import DateTime, func, ForeignKey, Text, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from .enums import MeetingStatusEnum


if TYPE_CHECKING:
    from .availability_slot import AvailabilitySlot
    from .mentor_assignment import MentorAssignment 

class Meeting(Base):
    """
    Represents a scheduled meeting between a mentor and student.
 
    Business rules:
    - slot_id is UNIQUE — one slot can only ever back one meeting, preventing
      double booking at the DB level
    - When a meeting is created, availability_slots.is_booked must be set to
      TRUE in the same transaction to keep slot state consistent
    - When a meeting is cancelled, availability_slots.is_booked must be set
      back to FALSE in the same transaction so the slot becomes bookable again
    - start_datetime and end_datetime are intentionally denormalised from
      availability_slots — stored here so email generation does not require
      an extra join to the slots table
    - cancelled_reason is only populated when status = 'cancelled'
    - meeting_notes is only populated when status = 'completed'
    - ondelete=RESTRICT on assignment_id and slot_id — a meeting cannot be
      orphaned by deleting its assignment or slot
    """

    __tablename__ = "meetings"

    id               : Mapped[int]                  = mapped_column(primary_key=True, autoincrement=True)
    assignment_id    : Mapped[int]                  = mapped_column(ForeignKey("mentor_assignments.id", ondelete="RESTRICT"))
    slot_id          : Mapped[int]                  = mapped_column(ForeignKey("availability_slots.id", ondelete="RESTRICT"), unique=True)
    start_datetime   : Mapped[datetime]             = mapped_column()   # denormalised for email generation
    end_datetime     : Mapped[datetime]             = mapped_column()   # denormalised for email generation
    meeting_url      : Mapped[Optional[str]]        = mapped_column(Text, nullable=True)
    status           : Mapped[MeetingStatusEnum]    = mapped_column(SAEnum(MeetingStatusEnum, name="meeting_status_enum"), nullable=False, 
                                                                    server_default=MeetingStatusEnum.scheduled.value,
                                                                    default=MeetingStatusEnum.scheduled,)
    cancelled_reason : Mapped[Optional[str]]        = mapped_column(Text, nullable=True)
    meeting_notes    : Mapped[Optional[str]]        = mapped_column(Text, nullable=True)
    created_at       : Mapped[datetime]             = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at       : Mapped[datetime]             = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    assignment : Mapped["MentorAssignment"] = relationship(back_populates="meetings")
    slot       : Mapped["AvailabilitySlot"] = relationship(back_populates="meeting")
