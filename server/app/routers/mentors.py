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
from app.core.email import send_email
from typing import Optional, List
from app.db.database import get_db
from app.models.mentor_application import MentorApplication
from app.models.enums import ServiceTypeEnum, GenderEnum, ApplicationStatusEnum
from app.schemas.mentor_application import MentorApplicationCreate
from app.core.email import send_email


router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# class MentorApplicationForm(BaseModel):
#     full_name: str
#     email: EmailStr
#     employer: Optional[str] = None
#     job_title: Optional[str] = None
#     industry: Optional[str] = None
#     experience: Optional[str] = None
#     linkedin_url: Optional[str] = None
#     major: Optional[str] = None
#     alma_mater: Optional[str] = None
#     county: Optional[str] = None
#     state: Optional[str] = None
#     other_info: Optional[str] = None
#     service_types: List[ServiceTypeEnum] = []

@router.post("/mentors/apply")
async def apply_mentor(form: MentorApplicationCreate, db: AsyncSession = Depends(get_db)):
    # Check if email already exists
    result = await db.execute(
        select(MentorApplication).where(MentorApplication.email == form.email)
    )
    existing = result.scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=400, detail="An application has already been submitted using this email address.")

    application = MentorApplication(
        full_name=form.full_name,
        email=form.email,
        gender=form.gender,
        employer=form.employer,
        job_title=form.job_title,
        industry=form.industry,
        experience=form.experience,
        linkedin_url=str(form.linkedin_url) if form.linkedin_url else None,
        major=form.major,
        alma_mater=form.alma_mater,
        phone_number=form.phone_number,
        county=form.county,
        state=form.state,
        other_info=form.other_info,
        service_types=form.service_types,
        status=ApplicationStatusEnum.pending
    )
    db.add(application)
    await db.commit()
    await db.refresh(application)
    
    await send_email(
        subject="Thank You for Your Application - Ummah Professionals",
        recipient=form.email,
        body=f""" <p>Assalamu Alaikum, </p>
            <p>Thank you for your interest in becoming a Career Advisor with Ummah Professionals. We have received your application and our team will review it shortly.</p>
            <p>In the meantime, if you have any questions, feel free to reach out to us.</p>
            <p>We appreciate your willingness to give back to the community and look forward to potentially welcoming you to our network of volunteers.</p>
            <p>Jazakum Allahu Khayran,<br>The Ummah Professionals Team</p>
            """
    )

    await send_email(
        subject="We received your mentor application!",
        recipient=form.email,
        body="<h2>Hi " + form.full_name + ",</h2><p>Thank you for applying to be a mentor with Ummah Professionals. Our team will review your application and get back to you soon.</p><p>We appreciate your interest in supporting the next generation of professionals!</p>"
    )

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