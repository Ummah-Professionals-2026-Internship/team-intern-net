from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.core.deps import get_current_user
from app.core.security import pwd_context
from app.models.user import User
from app.schemas.auth import ChangePasswordRequest

router = APIRouter(
    prefix="/auth",
    tags=["auth"],
)


@router.patch("/change-password")
async def change_password(
    payload: ChangePasswordRequest,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user_id = int(user["sub"])

    result = await db.execute(
        select(User).where(User.id == user_id)
    )

    db_user = result.scalar_one_or_none()

    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Verify current password
    if not pwd_context.verify(
        payload.current_password,
        db_user.password_hash,
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )

    # Verify new passwords match
    if payload.new_password != payload.confirm_new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New passwords do not match.",
        )

    # Prevent reusing current password
    if pwd_context.verify(
        payload.new_password,
        db_user.password_hash,
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from the current password.",
        )

    # Update password
    db_user.password_hash = pwd_context.hash(
        payload.new_password
    )

    await db.commit()

    return {
        "message": "Password updated successfully."
    }