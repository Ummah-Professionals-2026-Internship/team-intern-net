import logging
import secrets
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

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
from app.schemas.student_intake_form import (
    IntakeFormAdminResponse,
    IntakeFormCreate,
    IntakeFormResponse,
    IntakeFormStatusUpdate,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/intake", tags=["Intake"])

# --- Resume upload config -------------------------------------------------
# TODO: point this at persistent/network storage (S3, GCS, etc.) once this
# ships anywhere beyond a single box — local disk won't survive redeploys
# on most hosting platforms and won't work at all with >1 app instance.
# Keep this in mind when we deploy this app
RESUME_UPLOAD_DIR = Path("uploads/resumes")
MAX_RESUME_SIZE_BYTES = 5 * 1024 * 1024  # 5MB, matches the frontend limit
ALLOWED_RESUME_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
}
ALLOWED_RESUME_EXTENSIONS = {".pdf", ".doc", ".docx"}


async def _save_resume(resume: UploadFile) -> str:
    """
    Validates and persists an uploaded resume to disk.

    Re-validates type/size server-side rather than trusting the frontend's
    checks (which are trivial to bypass via a direct API call), and never
    trusts the client-supplied filename for the on-disk path.

    Returns the stored relative path to save as Student.resume_url.
    Raises HTTPException(422) on invalid type/size, HTTPException(500) if
    the file can't be written.
    """
    if resume.content_type not in ALLOWED_RESUME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Resume must be a PDF or Word document",
        )

    original_ext = Path(resume.filename or "").suffix.lower()
    if original_ext not in ALLOWED_RESUME_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Resume must be a PDF or Word document",
        )

    contents = await resume.read()
    if len(contents) > MAX_RESUME_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Resume must be smaller than 5MB",
        )
    if not contents:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Resume file appears to be empty",
        )

    RESUME_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    # UUID-based filename: sidesteps path traversal, collisions, and
    # accidental overwrites from the original client-supplied name.
    safe_filename = f"{uuid.uuid4().hex}{original_ext}"
    destination = RESUME_UPLOAD_DIR / safe_filename

    try:
        with open(destination, "wb") as f:
            f.write(contents)
    except OSError as e:
        logger.error(f"Failed to write resume to disk: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save resume. Please try again.",
        )

    return str(destination)


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
    industry: Optional[str] = Form(None),
    service_type: ServiceTypeEnum = Form(...),
    desired_career: Optional[str] = Form(None),
    referral_source: Optional[str] = Form(None),
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
            industry=industry,
            service_type=service_type,
            desired_career=desired_career,
            referral_source=referral_source,
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

    # 3. Process Optional Resume Upload — done after the duplicate-email
    # check above so a rejected submission doesn't leave an orphaned file
    # on disk with no record pointing to it.
    resume_path = None
    if resume:
        resume_path = await _save_resume(resume)

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
        resume_url=resume_path,
        resume_uploaded_at=datetime.now(timezone.utc).replace(tzinfo=None) if resume_path else None,    
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
        industry=validated_data.industry,
        referral_source=validated_data.referral_source,
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


@router.get("", response_model=List[IntakeFormAdminResponse])
async def get_all_intakes(db: AsyncSession = Depends(get_db)):
    """
    Fetches all student intake applications from the database 
    to populate the admin dashboard panels.
    """
    result = await db.execute(
        select(StudentIntakeForm)
        .options(selectinload(StudentIntakeForm.student).selectinload(Student.user))
        .order_by(desc(StudentIntakeForm.created_at))
    )
    forms = result.scalars().all()
    for f in forms:
        if not f.full_name and f.student and f.student.user:
            f.full_name = f.student.user.full_name
        if not f.email and f.student and f.student.user:
            f.email = f.student.user.email
    return forms


@router.patch("/{intake_id}/status", response_model=IntakeFormResponse)
async def update_intake_status(
    intake_id: int,
    status_update: IntakeFormStatusUpdate,
    db: AsyncSession = Depends(get_db),
):
    """
    Updates status of a student intake application.
    """
    result = await db.execute(
        select(StudentIntakeForm).where(StudentIntakeForm.id == intake_id)
    )
    intake = result.scalar_one_or_none()
    if not intake:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Intake form #{intake_id} not found",
        )

    intake.status = status_update.status
    await db.commit()
    await db.refresh(intake)
    return intake

@router.delete("/{intake_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_intake(
    intake_id: int,
    db: AsyncSession = Depends(get_db),
):
    # 1. Fetch the Intake Form
    result = await db.execute(
        select(StudentIntakeForm).where(StudentIntakeForm.id == intake_id)
    )
    intake = result.scalar_one_or_none()

    if not intake:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Intake form #{intake_id} not found"
        )

    student_id = intake.student_id

    # 2. Delete the intake form
    await db.delete(intake)

    # 3. If tied to a student, fetch and delete student BEFORE user
    if student_id:
        student_res = await db.execute(
            select(Student).where(Student.user_id == student_id)
        )
        student = student_res.scalar_one_or_none()
        
        if student:
            await db.delete(student) # Deletes Student row first

        user_res = await db.execute(
            select(User).where(User.id == student_id)
        )
        user = user_res.scalar_one_or_none()
        
        if user:
            await db.delete(user) # Deletes User row last

    await db.commit()
    return None