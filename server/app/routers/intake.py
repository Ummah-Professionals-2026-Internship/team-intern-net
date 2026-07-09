from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import secrets
from passlib.context import CryptContext
from app.db.database import get_db
from app.models.student_intake_form import StudentIntakeForm
from app.models.user import User
from app.models.student import Student
from app.models.enums import ServiceTypeEnum, GenderEnum, RoleEnum
from app.schemas.student_intake_form import IntakeFormCreate, IntakeFormResponse
from app.core.email import send_email

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

@router.post("/intake", response_model=IntakeFormResponse)
async def submit_intake(form: IntakeFormCreate, db: AsyncSession = Depends(get_db)):
    # Check if email already exists
    existing = await db.execute(select(User).where(User.email == form.email))
    existing_user = existing.scalar_one_or_none()
    if existing_user:
        raise HTTPException(status_code=400, detail="An account with this email already exists. Please log in.")

    # Generate temp password
    temp_password = secrets.token_urlsafe(10)

    # Create User record
    user = User(
        full_name=form.full_name,
        email=form.email,
        password_hash=pwd_context.hash(temp_password),
        role=RoleEnum.student,
        gender=form.gender
    )
    db.add(user)
    await db.flush()

    # Create Student record
    student = Student(
        user_id=user.id,
        major=form.major,
        education_level=form.education_level,
        academic_standing=form.academic_standing
    )
    db.add(student)
    await db.flush()

    # Create intake form record with student_id backfilled
    intake = StudentIntakeForm(
        full_name=form.full_name,
        email=form.email,
        student_id=student.user_id,
        phone=form.phone,
        service_type=form.service_type,
        desired_career=form.desired_career,
        major=form.major,
        gender=form.gender,
        comments=form.comments
    )
    db.add(intake)
    await db.commit()
    await db.refresh(intake)

    # Send credentials email
    await send_email(
        subject="Welcome to Ummah Professionals Career Prep!",
        recipient=form.email,
        body="<h2>Hi " + form.full_name + ",</h2><p>Your Career Prep account has been created. Here are your login credentials:</p><p><strong>Email:</strong> " + form.email + "</p><p><strong>Temporary Password:</strong> " + temp_password + "</p><p>Please log in and change your password immediately.</p><p>We'll be in touch once a mentor has been assigned to you!</p>"
    )

    return intake

@router.get("/intake", response_model=List[IntakeFormResponse])
async def get_intake(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(StudentIntakeForm))
    return result.scalars().all()