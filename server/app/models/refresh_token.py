from datetime import datetime
from sqlalchemy import String, Boolean, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from typing import TYPE_CHECKING

from app.db.base import Base



if TYPE_CHECKING:
    from .user import User

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id         : Mapped[int]      = mapped_column(primary_key=True, autoincrement=True)
    user_id    : Mapped[int]      = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token_hash : Mapped[str]      = mapped_column(String(255), index=True)
    is_revoked : Mapped[bool]     = mapped_column(Boolean, default=False)
    expires_at : Mapped[datetime] = mapped_column()
    created_at : Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user : Mapped["User"] = relationship(back_populates="refresh_tokens")
