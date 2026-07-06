from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Text, DateTime, func, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from .enums import ServiceTypeEnum, IntakeFormStatusEnum, GenderEnum



if TYPE_CHECKING:
    from .student import Student
    from .mentor_assignment import MentorAssignment 

class StudentIntakeForm(Base):
    """
    Captures a student's service request. Supports two submission flows:
 
    First-time submission (no account):
    - full_name and email are populated from the form
    - student_id is NULL at insert time
    - The backend creates a User + Student record from this data, then
      backfills student_id and clears full_name/email on this row
    - Login credentials are sent to the student via email
 
    Returning student submission (has account):
    - student_id is populated immediately from the authenticated user
    - full_name and email remain NULL (already on the users table)
 
    Business rules:
    - Before first-time submission the backend checks if email already exists
      in users — if so the student is redirected to login instead
    - major here represents major at time of request and may differ from
      students.major which is the student's current profile major
    - desired_career is per-request and lives here not on students table
    - status transitions: submitted → assigned → completed / cancelled
    - ondelete=SET NULL on student_id — if a student is deleted the form
      record is preserved for historical reference
    """


    __tablename__ = "student_intake_forms"

    id             : Mapped[int]                       = mapped_column(primary_key=True, autoincrement=True)
    full_name      : Mapped[Optional[str]]             = mapped_column(String(255), nullable=True)  # populated on first-time submission
    email          : Mapped[Optional[str]]             = mapped_column(String(255), nullable=True)  # populated on first-time submission
    student_id     : Mapped[Optional[int]]             = mapped_column(ForeignKey("students.user_id", ondelete="SET NULL"), nullable=True, index=True)
    phone          : Mapped[Optional[str]]             = mapped_column(String(30), nullable=True)
    service_type   : Mapped[ServiceTypeEnum]           = mapped_column(SAEnum(ServiceTypeEnum, name="service_type_enum", create_type=False))
    gender         : Mapped[GenderEnum]                = mapped_column(SAEnum(GenderEnum, name="gender_enum"), nullable=True)

    desired_career : Mapped[Optional[str]]             = mapped_column(Text, nullable=True)
    major          : Mapped[Optional[str]]             = mapped_column(Text, nullable=True)
    comments       : Mapped[Optional[str]]             = mapped_column(Text, nullable=True)
    status         : Mapped[IntakeFormStatusEnum]      = mapped_column(
                                                             SAEnum(IntakeFormStatusEnum, name="intake_form_status_enum"),
                                                             default=IntakeFormStatusEnum.submitted
                                                         )
    created_at     : Mapped[datetime]                  = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at     : Mapped[datetime]                  = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    student    : Mapped[Optional["Student"]]          = relationship(back_populates="intake_forms")
    assignment : Mapped[Optional["MentorAssignment"]] = relationship(back_populates="intake_form", uselist=False)
