# Student Application Routing file
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import secrets
import logging

from app.db.database import get_db
from app.models.student_intake_form import StudentIntakeForm
from app.models.user import User
from app.models.student import Student
from app.models.enums import ServiceTypeEnum, GenderEnum, RoleEnum
from app.schemas.student_intake_form import IntakeFormCreate, IntakeFormResponse
from app.core.security import hash_password
from app.core.email import send_email

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/intake", response_model=IntakeFormResponse)
async def submit_intake(form: IntakeFormCreate, db: AsyncSession = Depends(get_db)):
    # 1. Check if email already exists
    result = await db.execute(select(User).where(User.email == form.email))
    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="An account with this email already exists. Please log in to submit a new request."
        )
    
    # 2. Auto-generate a password
    temp_password = secrets.token_urlsafe(10)

    # 3. Create User
    user = User(
        email=form.email,
        full_name=form.full_name,
        password_hash=hash_password(temp_password),
        role=RoleEnum.student,
        gender=form.gender,
        is_active=True,
    )
    db.add(user)
    await db.flush()  # flush to get user.id without committing yet

    # 4. Create Student profile
    student = Student(
        user_id=user.id,
        major=form.major,
        education_level=form.education_level,
        academic_standing=form.academic_standing,
    )
    db.add(student)
    await db.flush()  # flush to get student.user_id

    # 5. Create intake form record
    intake = StudentIntakeForm(
        student_id=student.user_id,
        full_name=form.full_name,
        email=form.email,
        phone=form.phone,
        service_type=form.service_type,
        desired_career=form.desired_career,
        major=form.major,
        gender=form.gender,
        comments=form.comments,
    )
    db.add(intake)

    # 6. Commit everything in one transaction
    await db.commit()
    await db.refresh(intake)

    # Send Notification Emails
    try:
        await send_email(
            recipient=form.email,
            subject="We received your Career Prep request!",
            body=f"""<p>Assalamu Alaikum, {form.full_name}</p> 
            <p>Thank you for submitting your Career Prep request. Our team will review your information and match you with a mentor soon.</p>
            <p>Service Requested: {form.service_type.value}. We'll be in touch with next steps.</p> 
            <p>Jazakum Allahu Khayran,<br>The Ummah Professionals Team</p>"""
        )
        await send_email(
            recipient=form.email,
            subject="Welcome - Your Account Has Been Created",
            body=f"""<p>Assalamu Alaikum, {form.full_name}</p>
            <p>Your account has been created. Here are your login credentials:</p>
            <p><strong>Email:</strong> {form.email}</p>
            <p><strong>Password:</strong> {temp_password}</p>
            <p>Please log in and change your password after your first login.</p>
            <p>Jazakum Allahu Khayran,<br>The Ummah Professionals Team</p>"""
        )
    except Exception as e:
        logger.error(f"Failed to send email to {form.email} : {e}")
        pass
    
    return intake

@router.get("/intake", response_model=List[IntakeFormResponse])
async def get_intake(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(StudentIntakeForm))
    return result.scalars().all()