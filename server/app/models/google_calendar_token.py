from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import DateTime, ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from .user import User


class GoogleCalendarToken(Base):
    __tablename__ = "google_calendar_tokens"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False,)
    access_token: Mapped[str] = mapped_column(Text, nullable=False)
    refresh_token: Mapped[str] = mapped_column(Text, nullable=False)
    token_expiry: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True,)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(),)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(),)

    # Relationships
    user: Mapped["User"] = relationship(back_populates="google_calendar_token")