import logging
import secrets
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.email import send_email
from app.core.security import hash_password
from app.db.database import get_db
from app.models.enums import (
    AcademicStandingEnum,
    EducationLevelEnum,
    GenderEnum,
    RoleEnum,
    ServiceTypeEnum,
)
from app.models.student import Student
from app.models.student_intake_form import StudentIntakeForm
from app.models.user import User
from app.schemas.student_intake_form import IntakeFormCreate, IntakeFormResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/intake", tags=["Intake"])


@router.post(
    "/apply",
    response_model=IntakeFormResponse,
    status_code=status.HTTP_201_CREATED,
)
async def submit_intake(
    full_name: str = Form(...),
    email: str = Form(...),
    phone: Optional[str] = Form(None),
    gender: Optional[GenderEnum] = Form(None),
    education_level: EducationLevelEnum = Form(...),
    academic_standing: Optional[AcademicStandingEnum] = Form(None),
    major: Optional[str] = Form(None),
    service_type: ServiceTypeEnum = Form(...),
    desired_career: Optional[str] = Form(None),
    comments: Optional[str] = Form(None),
    resume: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Submits an intake application via multipart/form-data.
    1. Validates input via Pydantic model.
    2. Ensures user account doesn't already exist.
    3. Handles optional resume file upload.
    4. Auto-provisions User (student role) and Student profile records.
    5. Saves StudentIntakeForm record with relations.
    6. Sends welcome & application confirmation emails.
    """
    # 1. Validate fields using the Pydantic schema
    try:
        validated_data = IntakeFormCreate(
            full_name=full_name,
            email=email,
            phone=phone,
            gender=gender,
            education_level=education_level,
            academic_standing=academic_standing,
            major=major,
            service_type=service_type,
            desired_career=desired_career,
            comments=comments,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e)
        )

    # 2. Check if user already exists
    existing_user_result = await db.execute(
        select(User).where(User.email == validated_data.email)
    )
    if existing_user_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists. Please log in to submit your request.",
        )

    # 3. Process Optional Resume Upload
    resume_path = None
    if resume:
        # TODO: Replace with S3 or local persistent storage handler as needed
        resume_path = f"uploads/resumes/{resume.filename}"

    # 4. Auto-generate temp password & create User record
    temp_password = secrets.token_urlsafe(10)

    user = User(
        email=validated_data.email,
        full_name=validated_data.full_name,
        password_hash=hash_password(temp_password),
        role=RoleEnum.student,
        gender=validated_data.gender,
        is_active=True,
    )
    db.add(user)
    await db.flush()  # Flush to populate user.id prior to transaction commit

    # 5. Create Student Profile record
    student = Student(
        user_id=user.id,
        major=validated_data.major,
        education_level=validated_data.education_level,
        academic_standing=validated_data.academic_standing,
    )
    db.add(student)
    await db.flush()  # Flush to link student profile

    # 6. Create Student Intake Form record
    intake = StudentIntakeForm(
        student_id=student.user_id,
        full_name=validated_data.full_name,
        email=validated_data.email,
        phone=validated_data.phone,
        gender=validated_data.gender,
        service_type=validated_data.service_type,
        desired_career=validated_data.desired_career,
        major=validated_data.major,
        comments=validated_data.comments,
    )
    db.add(intake)

    # 7. Commit atomic transaction across User, Student, and Intake records
    await db.commit()
    await db.refresh(intake)

    # 8. Dispatch welcome & confirmation emails
    try:
        # Confirmation Email
        await send_email(
            subject="We received your Career Prep request!",
            recipient=validated_data.email,
            body=f"""
            <h2>Assalamu Alaikum {validated_data.full_name},</h2>
            <p>Thank you for submitting your Career Prep request. Our team will review your information and match you with a mentor soon.</p>
            <p><strong>Service Requested:</strong> {validated_data.service_type.value}</p>
            <p>Jazakum Allahu Khayran,<br>The Ummah Professionals Team</p>
            """,
        )

        # Credentials Email
        await send_email(
            subject="Welcome - Your Account Has Been Created",
            recipient=validated_data.email,
            body=f"""
            <h2>Assalamu Alaikum {validated_data.full_name},</h2>
            <p>Your account has been created. Here are your temporary login credentials:</p>
            <p><strong>Email:</strong> {validated_data.email}</p>
            <p><strong>Password:</strong> {temp_password}</p>
            <p>Please log in and update your password after your first login.</p>
            <p>Jazakum Allahu Khayran,<br>The Ummah Professionals Team</p>
            """,
        )
    except Exception as e:
        logger.error(f"Failed to dispatch intake email to {validated_data.email}: {e}")

    return intake


@router.get("", response_model=List[IntakeFormResponse])
async def get_all_intakes(db: AsyncSession = Depends(get_db)):
    """
    Fetches all student intake applications from the database 
    to populate the admin dashboard panels.
    """
    result = await db.execute(
        select(StudentIntakeForm).order_by(desc(StudentIntakeForm.created_at))
    )
    return result.scalars().all()