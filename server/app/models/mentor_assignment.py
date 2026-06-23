from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import ForeignKey, DateTime, func, Enum as SAEnum, Index, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from .enums import AssignmentStatusEnum


if TYPE_CHECKING:
    from .student import Student
    from .mentor import Mentor
    from .student_intake_form import StudentIntakeForm
    from .user import User
    from .meeting import Meeting 


class MentorAssignment(Base):
    __tablename__ = "mentor_assignments"

    id             : Mapped[int]                      = mapped_column(primary_key=True, autoincrement=True)
    mentor_id      : Mapped[int]                      = mapped_column(ForeignKey("mentors.user_id", ondelete="RESTRICT"))
    student_id     : Mapped[int]                      = mapped_column(ForeignKey("students.user_id", ondelete="RESTRICT"))
    intake_form_id : Mapped[int]                      = mapped_column(ForeignKey("student_intake_forms.id", ondelete="RESTRICT"))
    assigned_by    : Mapped[int]                      = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"))
    status         : Mapped[AssignmentStatusEnum]     = mapped_column(SAEnum(AssignmentStatusEnum, name="assignment_status_enum"),
                                                                      server_default=AssignmentStatusEnum.active.value)
    assigned_at    : Mapped[datetime]                 = mapped_column(DateTime(timezone=True), server_default=func.now())
    completed_at   : Mapped[Optional[datetime]]       = mapped_column(nullable=True)

    # Relationships
    mentor      : Mapped["Mentor"]               = relationship(back_populates="assignments")
    student     : Mapped["Student"]              = relationship(back_populates="assignments")
    intake_form : Mapped["StudentIntakeForm"]    = relationship(back_populates="assignment")
    admin       : Mapped["User"]                 = relationship(foreign_keys=[assigned_by])
    meetings    : Mapped[List["Meeting"]]        = relationship(back_populates="assignment", cascade="all, delete-orphan")

    # Partial unique indexes — one active assignment per mentor, one per student at a time
    __table_args__ = (
        Index("uq_active_mentor",  "mentor_id",  unique=True, postgresql_where=text("status = 'active'")),
        Index("uq_active_student", "student_id", unique=True, postgresql_where=text("status = 'active'")),
    )
