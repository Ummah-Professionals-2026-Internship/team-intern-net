from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import DateTime, func, String, Text, Integer, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import ARRAY, ENUM as PGEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from .enums import ApplicationStatusEnum, ServiceTypeEnum


if TYPE_CHECKING:
    from .user import User


class MentorApplication(Base):
    __tablename__ = "mentor_applications"

    id              : Mapped[int]                          = mapped_column(primary_key=True, autoincrement=True)
    full_name       : Mapped[str]                          = mapped_column(String(255))
    email           : Mapped[str]                          = mapped_column(String(255))
    employer        : Mapped[Optional[str]]                = mapped_column(String(255), nullable=True)
    job_title       : Mapped[Optional[str]]                = mapped_column(String(255), nullable=True)
    industry        : Mapped[Optional[str]]                = mapped_column(String(255), nullable=True)
    experience      : Mapped[Optional[str]]                = mapped_column(Text, nullable=True)
    linkedin_url    : Mapped[Optional[str]]                = mapped_column(Text, nullable=True)
    major           : Mapped[Optional[str]]                = mapped_column(String(255), nullable=True)
    alma_mater      : Mapped[Optional[str]]                = mapped_column(String(255), nullable=True)
    county          : Mapped[Optional[str]]                = mapped_column(String(100), nullable=True)
    state           : Mapped[Optional[str]]                = mapped_column(String(100), nullable=True)
    other_info      : Mapped[Optional[str]]                = mapped_column(Text, nullable=True)
    service_types   : Mapped[List[str]]                    = mapped_column(
                                                                ARRAY(PGEnum(ServiceTypeEnum, name="service_type_enum", create_type=False)),
                                                                server_default="{}"
                                                            )
    status          : Mapped[ApplicationStatusEnum]        = mapped_column(
                                                                SAEnum(ApplicationStatusEnum, name="application_status_enum"),
                                                                default=ApplicationStatusEnum.pending
                                                            )
    applied_at      : Mapped[datetime]                     = mapped_column(DateTime(timezone=True), server_default=func.now())
    reviewed_at     : Mapped[Optional[datetime]]           = mapped_column(nullable=True)
    reviewed_by     : Mapped[Optional[int]]                = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_user_id : Mapped[Optional[int]]                = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    # reviewer     : Mapped[Optional["User"]] = relationship(foreign_keys=[reviewed_by], back_populates="reviewed_applications")
    # created_user : Mapped[Optional["User"]] = relationship(foreign_keys=[created_user_id])
    reviewer     : Mapped[Optional["User"]] = relationship(foreign_keys=[reviewed_by])
    created_user : Mapped[Optional["User"]] = relationship(foreign_keys=[created_user_id]) 