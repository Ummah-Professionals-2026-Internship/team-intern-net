from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import get_db
from app.models.student_intake_form import StudentIntakeForm
from app.schemas.student_intake_form import IntakeFormCreate, IntakeFormResponse
from app.core.email import send_email
from typing import List

router = APIRouter()

@router.post("/intake", response_model=IntakeFormResponse)
async def submit_intake(form: IntakeFormCreate, db: AsyncSession = Depends(get_db)):
    intake = StudentIntakeForm(
        full_name=form.full_name,
        email=form.email,
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

    await send_email(
        subject="We received your Career Prep request!",
        recipient=form.email,
        body="<h2>Hi " + form.full_name + ",</h2><p>Thank you for submitting your Career Prep request. Our team will review your information and match you with a mentor soon.</p><p><strong>Service Requested:</strong> " + form.service_type.value + "</p><p>We'll be in touch with next steps!</p>"
    )

    return intake

@router.get("/intake", response_model=List[IntakeFormResponse])
async def get_intake(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(StudentIntakeForm))
    return result.scalars().all()