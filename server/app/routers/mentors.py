from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from typing import Optional
from passlib.context import CryptContext
from app.db.database import get_db
from app.models.user import User
from app.models.mentor import Mentor
from app.models.enums import UserType, Gender, MentorStatus

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class MentorApplicationForm(BaseModel):
    name: str
    email: EmailStr
    gender: Gender
    linkedin_url: Optional[str] = None
    job_title: Optional[str] = None
    company: Optional[str] = None
    bio: Optional[str] = None
    tags: Optional[str] = None  # comma-separated specializations

@router.post("/mentors/apply")
async def apply_mentor(form: MentorApplicationForm, db: AsyncSession = Depends(get_db)):
    # Check if email already exists
    result = await db.execute(select(User).where(User.email == form.email))
    existing_user = result.scalar_one_or_none()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already in use")

    # Create placeholder password (replaced once approved)
    temp_password = pwd_context.hash("pending_approval")

    user = User(
        name=form.name,
        email=form.email,
        password_hash=temp_password,
        user_type=UserType.MENTOR,
        gender=form.gender
    )
    db.add(user)
    await db.flush()  # get user.id before commit

    mentor = Mentor(
        user_id=user.id,
        status=MentorStatus.PENDING,
        linkedin_url=form.linkedin_url,
        job_title=form.job_title,
        company=form.company,
        bio=form.bio,
        tags=form.tags
    )
    db.add(mentor)
    await db.commit()
    await db.refresh(mentor)

    return {"message": "Mentor application submitted successfully", "user_id": user.id}

@router.get("/mentors/applications")
async def get_mentor_applications(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User, Mentor)
        .join(Mentor, Mentor.user_id == User.id)
        .where(Mentor.status == MentorStatus.PENDING)
    )
    applications = result.all()
    return [
        {
            "user_id": user.id,
            "name": user.name,
            "email": user.email,
            "gender": user.gender,
            "linkedin_url": mentor.linkedin_url,
            "job_title": mentor.job_title,
            "company": mentor.company,
            "bio": mentor.bio,
            "tags": mentor.tags,
            "status": mentor.status
        }
        for user, mentor in applications
    ]