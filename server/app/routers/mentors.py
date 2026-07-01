from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from app.db.database import get_db
from app.models.mentor_application import MentorApplication
from app.models.enums import ServiceTypeEnum, GenderEnum, ApplicationStatusEnum
from app.schemas.mentor_application import MentorApplicationCreate
from app.core.email import send_email


router = APIRouter()

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
        body=f""" <h2>Assalamu Alaikum, </h2>
            <p>Thank you for your interest in becoming a Career Advisor with Ummah Professionals. We have received your application and our team will review it shortly.</p>
            <p>In the meantime, if you have any questions, feel free to reach out to us.</p>
            <p>We appreciate your willingness to give back to the community and look forward to potentially welcoming you to our network of volunteers.</p>
            <p>Jazakum Allahu Khayran,<br>The Ummah Professionals Team</p>
            """
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