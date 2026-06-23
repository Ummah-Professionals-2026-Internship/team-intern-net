from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from app.db.database import get_db
from app.models.mentor_application import MentorApplication
from app.models.enums import ServiceTypeEnum, GenderEnum, ApplicationStatusEnum

router = APIRouter()

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