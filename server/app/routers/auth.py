import os
from fastapi import APIRouter, HTTPException, Depends
from app.core.security import (
    create_token,
    verify_password,
    hash_password,
    create_reset_token,
    verify_reset_token,
)

from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db # SQL Async imported and database too

from sqlalchemy import select # Selecting is imported from SQL
from app.models.user import User #User imported from models
from app.models.enums import RoleEnum
from app.core.deps import get_current_user
from app.schemas.auth import (
    LoginRequest,
    LoggedInUser,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    ChangePasswordRequest,
)
from app.core.email import send_email


router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login") #Asks & Receives login req:email & password
async def login(
    payload: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(User).where(User.email == payload.email) #Searches user via email in users in db
    )

    user = result.scalar_one_or_none() 

    if not user:
        raise HTTPException(
            status_code=401,
            detail = "No user found!"
        ) #If no user match found, error
    
    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials!"
        ) #If password (gets hashed) doesn't match with stored hashed_password, error
    
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is inactive")

    token = create_token(
        {"sub": str(user.id), "role": user.role.value, }
    )  #Then create a token for user with id & role

    return {
        "access_token": token,
        "token_type": "bearer",
        "refresh_token" : None,
        "user" : LoggedInUser.model_validate(user)
    } #Returns the token


@router.post("/forgot-password")
async def forgot_password(
    payload: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    generic_message = (
        "If an account associated with this email is eligible for automated reset, "
        "instructions have been sent to your inbox."
    )

    result = await db.execute(
        select(User).where(User.email == payload.email)
    )
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        return {"message": generic_message}

    if user.role == RoleEnum.admin:
        admin_email_body = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <h2 style="color: #007CA6;">Admin Account Security Notice</h2>
          <p>Hello <strong>{user.full_name}</strong>,</p>
          <p>A password reset was requested for your administrative account on <strong>Ummah Professionals</strong>.</p>
          <p style="background-color: #fff3cd; color: #856404; padding: 12px; border-radius: 6px; border-left: 4px solid #ffeeba;">
            <strong>Security Notice:</strong> Automated password resets via web link are disabled for administrative roles to protect system integrity.
          </p>
          <p>If you need to update your admin credentials, please follow standard IT security procedures or contact your lead administrator.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;" />
          <p style="font-size: 0.85em; color: #666;">If you did not request this notification, please review your account activity.</p>
        </div>
        """
        try:
            await send_email(
                subject="Admin Account Security Notice – Ummah Professionals",
                recipient=user.email,
                body=admin_email_body,
            )
        except Exception as e:
            print(f"Error sending admin password notification email: {e}")

        return {"message": generic_message}

    token = create_reset_token(user.id)
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    reset_link = f"{frontend_url}/reset-password?token={token}"

    email_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      <h2 style="color: #007CA6;">Password Reset Request</h2>
      <p>Hello <strong>{user.full_name}</strong>,</p>
      <p>We received a request to reset your password for your <strong>Ummah Professionals</strong> account.</p>
      <p>Please click the button below to reset your password. This link is valid for 30 minutes:</p>
      <p style="margin: 25px 0;">
        <a href="{reset_link}" style="background-color: #007CA6; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
          Reset Password
        </a>
      </p>
      <p>Or copy and paste this URL into your browser:</p>
      <p><a href="{reset_link}" style="color: #007CA6;">{reset_link}</a></p>
      <hr style="border: none; border-top: 1px solid #eee; margin: 25px 0;" />
      <p style="font-size: 0.85em; color: #666;">If you did not request a password reset, you can safely ignore this email.</p>
    </div>
    """

    try:
        await send_email(
            subject="Password Reset Request – Ummah Professionals",
            recipient=user.email,
            body=email_body,
        )
    except Exception as e:
        print(f"Error sending password reset email: {e}")

    return {"message": generic_message}


@router.post("/reset-password")
async def reset_password(
    payload: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db)
):
    token_data = verify_reset_token(payload.token)
    if not token_data:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired reset token. Please request a new password reset link."
        )

    try:
        user_id = int(token_data["sub"])
    except (ValueError, KeyError):
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired reset token."
        )

    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user or user.role == RoleEnum.admin:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired reset token."
        )

    if len(payload.new_password) < 6:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 6 characters long."
        )

    user.password_hash = hash_password(payload.new_password)
    await db.commit()

    return {
        "message": "Password reset successfully. You can now log in with your new password."
    }


@router.post("/change-password")
async def change_password(
    payload: ChangePasswordRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    user_id = int(current_user["sub"])
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect current password.")

    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters long.")

    user.password_hash = hash_password(payload.new_password)
    await db.commit()

    return {"message": "Password changed successfully."}




