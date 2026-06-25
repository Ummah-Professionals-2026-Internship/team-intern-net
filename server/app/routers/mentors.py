from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import get_db
from app.models.mentor_application import MentorApplication
from app.models.enums import ApplicationStatusEnum
from app.schemas.mentor_application import MentorApplicationCreate, MentorApplicationResponse
from app.core.email import send_email
from typing import List

router = APIRouter()

@router.post("/mentors/apply", response_model=MentorApplicationResponse)
async def apply_mentor(form: MentorApplicationCreate, db: AsyncSession = Depends(get_db)):
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
        linkedin_url=str(form.linkedin_url) if form.linkedin_url else None,
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

    await send_email(
        subject="We received your mentor application!",
        recipient=form.email,
        body="<h2>Hi " + form.full_name + ",</h2><p>Thank you for applying to be a mentor with Ummah Professionals. Our team will review your application and get back to you soon.</p><p>We appreciate your interest in supporting the next generation of professionals!</p>"
    )

    return application

@router.get("/mentors/applications", response_model=List[MentorApplicationResponse])
async def get_mentor_applications(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(MentorApplication).where(
            MentorApplication.status == ApplicationStatusEnum.pending
        )
    )
    return result.scalars().all()