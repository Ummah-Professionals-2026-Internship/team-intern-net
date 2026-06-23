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
