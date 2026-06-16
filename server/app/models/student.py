from sqlalchemy import String, Enum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import EducationLevel, AcademicStanding


class Student(Base):
    __tablename__ = "students"

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        primary_key=True
    )

    major: Mapped[str] = mapped_column(String, nullable=True)
    desired_career: Mapped[str] = mapped_column(String, nullable=True)

    education_level: Mapped[EducationLevel] = mapped_column(Enum(EducationLevel))
    academic_standing: Mapped[AcademicStanding] = mapped_column(Enum(AcademicStanding))

    user = relationship("User")