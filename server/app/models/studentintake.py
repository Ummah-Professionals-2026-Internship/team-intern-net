from sqlalchemy import String, Enum, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.models.enums import ServiceType, Gender


class Intake(Base):
    __tablename__ = "student_intake_forms"

    id: Mapped[int] = mapped_column(primary_key=True)

    name: Mapped[str] = mapped_column(String(255))
    email: Mapped[str] = mapped_column(String(255))
    phone: Mapped[str] = mapped_column(String(255))

    service_type: Mapped[ServiceType] = mapped_column(Enum(ServiceType))
    desired_career: Mapped[str] = mapped_column(String(255))
    major: Mapped[str] = mapped_column(String(255))

    gender: Mapped[Gender] = mapped_column(Enum(Gender))

    comment: Mapped[str] = mapped_column(String)

    created_at: Mapped[str] = mapped_column(DateTime(timezone=True), server_default=func.now())