from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import  DateTime, func, Text, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base
from .enums import EducationLevelEnum, AcademicStandingEnum

if TYPE_CHECKING:
    from .user import User
    from .student_intake_form import StudentIntakeForm
    from .mentor_assignment import MentorAssignment 


class Student(Base):
    __tablename__ = "students"

    user_id           : Mapped[int]                              = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    major             : Mapped[Optional[str]]                    = mapped_column(Text, nullable=True)
    education_level   : Mapped[Optional[EducationLevelEnum]]     = mapped_column(SAEnum(EducationLevelEnum, name="education_level_enum"), nullable=True)
    academic_standing : Mapped[Optional[AcademicStandingEnum]]   = mapped_column(SAEnum(AcademicStandingEnum, name="academic_standing_enum"), nullable=True)
    resume_url        : Mapped[Optional[str]]                    = mapped_column(Text, nullable=True)
    resume_uploaded_at: Mapped[Optional[datetime]]               = mapped_column(nullable=True)
    created_at        : Mapped[datetime]                         = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at        : Mapped[datetime]                         = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user         : Mapped["User"]                    = relationship(back_populates="student")
    intake_forms : Mapped[List["StudentIntakeForm"]] = relationship(back_populates="student")
    assignments  : Mapped[List["MentorAssignment"]]  = relationship(back_populates="student")

# created_at: Mapped[datetime] = mapped_column(
#     DateTime(timezone=True),
#     server_default=func.now(),
# )