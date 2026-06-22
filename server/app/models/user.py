from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import DateTime, func, String, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from .enums import RoleEnum, GenderEnum

if TYPE_CHECKING:
    from .student import Student
    from .mentor import Mentor
    from .refresh_token import RefreshToken


class User(Base):
    __tablename__ = "users"

    id            : Mapped[int]           = mapped_column(primary_key=True, autoincrement=True)
    email         : Mapped[str]           = mapped_column(String(255), unique=True, index=True)
    full_name     : Mapped[str]           = mapped_column(String(255))
    password_hash : Mapped[str]           = mapped_column(String(255))
    role          : Mapped[RoleEnum]      = mapped_column(SAEnum(RoleEnum, name="role_enum"))
    gender        : Mapped[GenderEnum]    = mapped_column(SAEnum(GenderEnum, name="gender_enum"), nullable=True)
    is_active     : Mapped[bool]          = mapped_column(default=True)
    created_at    : Mapped[datetime]      = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at    : Mapped[datetime]      = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_login_at : Mapped[Optional[datetime]] = mapped_column(nullable=True)

    # Relationships
    student        : Mapped[Optional["Student"]]       = relationship(back_populates="user", uselist=False)
    mentor         : Mapped[Optional["Mentor"]]        = relationship(back_populates="user", uselist=False)
    refresh_tokens : Mapped[List["RefreshToken"]]      = relationship(back_populates="user", cascade="all, delete-orphan")
    # reviewed_applications: Mapped[List["MentorApplication"]] = relationship(
    #     foreign_keys="MentorApplication.reviewed_by",
    #     back_populates="reviewer"
    # )
