from passlib.context import CryptContext
import secrets
from app.models.user import User
from app.models.mentor import Mentor
from app.models.enums import RoleEnum
from app.schemas.mentor_application import MentorApplicationReview
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from app.db.database import get_db
from app.models.mentor_application import MentorApplication
from app.models.enums import ServiceTypeEnum, GenderEnum, ApplicationStatusEnum

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class MentorApplicationForm(BaseModel):
    full_name: str
    email: EmailStr
    employer: Optional[str] = None
    job_title: Optional[str] = None
    industry: Optional[str] = None
    experience: Optional[str] = None
    linkedin_url: Optional[str] = None
    major: Optional[str] = None
    alma_mater: Optional[str] = None
    county: Optional[str] = None
    state: Optional[str] = None
    other_info: Optional[str] = None
    service_types: List[ServiceTypeEnum] = []

@router.post("/mentors/apply")
async def apply_mentor(form: MentorApplicationForm, db: AsyncSession = Depends(get_db)):
    # Check if email already exists
    result = await db.execute(
        select(MentorApplication).where(MentorApplication.email == form.email)
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="Email already submitted an application")

    application = MentorApplication(
        full_name=form.full_name,
        email=form.email,
        employer=form.employer,
        job_title=form.job_title,
        industry=form.industry,
        experience=form.experience,
        linkedin_url=form.linkedin_url,
        major=form.major,
        alma_mater=form.alma_mater,
        county=form.county,
        state=form.state,
        other_info=form.other_info,
        service_types=form.service_types,
        status=ApplicationStatusEnum.pending
    )
    db.add(application)
    await db.commit()
    await db.refresh(application)

    return {"message": "Mentor application submitted successfully", "application_id": application.id}

@router.get("/mentors/applications")
async def get_mentor_applications(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(MentorApplication).where(
            MentorApplication.status == ApplicationStatusEnum.pending
        )
    )
    return result.scalars().all()
@router.patch("/mentors/applications/{application_id}/approve")
async def approve_mentor(application_id: int, db: AsyncSession = Depends(get_db)):
    # Get the application
    result = await db.execute(
        select(MentorApplication).where(MentorApplication.id == application_id)
    )
    application = result.scalar_one_or_none()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    if application.status != ApplicationStatusEnum.pending:
        raise HTTPException(status_code=400, detail="Application is not pending")

    # Generate temp password
    temp_password = secrets.token_urlsafe(10)

    # Create User record
    user = User(
        full_name=application.full_name,
        email=application.email,
        password_hash=pwd_context.hash(temp_password),
        role=RoleEnum.mentor,
    )
    db.add(user)
    await db.flush()

    # Create Mentor record
    mentor = Mentor(
        user_id=user.id,
        employer=application.employer,
        job_title=application.job_title,
        industry=application.industry,
        linkedin_url=application.linkedin_url,
        alma_mater=application.alma_mater,
        county=application.county,
        state=application.state,
        service_types=application.service_types,
    )
    db.add(mentor)

    # Update application status
    application.status = ApplicationStatusEnum.approved
    application.created_user_id = user.id

    await db.commit()

    # Send credentials email
    await send_email(
        subject="Your Mentor Account has been approved!",
        recipient=application.email,
        body="<h2>Hi " + application.full_name + ",</h2><p>Your mentor application has been approved! Here are your login credentials:</p><p><strong>Email:</strong> " + application.email + "</p><p><strong>Temporary Password:</strong> " + temp_password + "</p><p>Please log in and change your password immediately.</p>"
    )

    return {"message": "Mentor approved and account created", "user_id": user.id}