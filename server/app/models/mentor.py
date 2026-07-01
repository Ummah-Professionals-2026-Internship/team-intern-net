from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, Text, Boolean, Integer, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import ARRAY, ENUM as PGEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from .enums import ServiceTypeEnum, GenderEnum


if TYPE_CHECKING:
    from .user import User
    from .availability_slot import AvailabilitySlot
    from .mentor_assignment import MentorAssignment
 
class Mentor(Base):
    __tablename__ = "mentors"

    user_id              : Mapped[int]           = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    gender               : Mapped[GenderEnum]    = mapped_column(PGEnum(GenderEnum, name="gender_enum"), nullable=True)
    bio                  : Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    linkedin_url         : Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    employer             : Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    job_title            : Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    industry             : Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    alma_mater           : Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    county               : Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    state                : Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    phone_number         : Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    service_types        : Mapped[List[str]]     = mapped_column(
                                                       ARRAY(PGEnum(ServiceTypeEnum, name="service_type_enum", create_type=False)),
                                                       server_default="{}"
                                                   )
    is_available         : Mapped[bool]          = mapped_column(Boolean, default=True)
    max_monthly_sessions : Mapped[int]           = mapped_column(Integer, default=2)
    created_at           : Mapped[datetime]      = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at           : Mapped[datetime]      = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user        : Mapped["User"]                   = relationship(back_populates="mentor")
    slots       : Mapped[List["AvailabilitySlot"]] = relationship(back_populates="mentor", cascade="all, delete-orphan")
    assignments : Mapped[List["MentorAssignment"]] = relationship(back_populates="mentor")
