from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from typing import Optional
from app.db.database import get_db
from app.models.studentintake import StudentIntake
from app.models.enums import ServiceType, Gender
from app.core.email import send_email

router = APIRouter()

# Schema for incoming form data
class IntakeForm(BaseModel):
    name: str
    email: EmailStr
    phone: str
    service_type: ServiceType
    desired_career: str
    major: str
    gender: Gender
    comment: Optional[str] = None

@router.post("/intake")
async def submit_intake(form: IntakeForm, db: AsyncSession = Depends(get_db)):
    intake = StudentIntake(
        name=form.name,
        email=form.email,
        phone=form.phone,
        service_type=form.service_type,
        desired_career=form.desired_career,
        major=form.major,
        gender=form.gender,
        comment=form.comment
    )
    db.add(intake)
    await db.commit()
    await db.refresh(intake)

    await send_email(
        subject="We received your Career Prep request!",
        recipient=form.email,
        body=f"""
        <h2>Hi {form.name},</h2>
        <p>Thank you for submitting your Career Prep request. Our team will review your information and match you with a mentor soon.</p>
        <p><strong>Service Requested:</strong> {form.service_type.value}</p>
        <p>We'll be in touch with next steps!</p>
        """
    )

    return {"message": "Intake submitted successfully", "intake_id": intake.id}

@router.get("/intake")
async def get_intake(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(StudentIntake))
    return result.scalars().all()