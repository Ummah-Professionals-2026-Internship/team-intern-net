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
