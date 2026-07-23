#Mentor Application API Routing file
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from app.db.database import get_db
from app.models.mentor_application import MentorApplication
from app.models.enums import ServiceTypeEnum, GenderEnum, ApplicationStatusEnum
from app.schemas.mentor_application import MentorApplicationCreate, MentorApplicationReview
from app.core.email import send_email
from app.core.deps import require_admin
from datetime import datetime
from app.models.user import User
from app.models.mentor import Mentor
from app.models.enums import RoleEnum
from app.core.security import hash_password
from app.core.deps import require_admin
from app.core.email import send_email
from datetime import datetime, timezone
import secrets
import logging
from app.core.deps import require_mentor
from app.models.meeting import Meeting 
from app.models.mentor_assignment import MentorAssignment
from sqlalchemy.orm import selectinload

logger = logging.getLogger(__name__)


router = APIRouter()


@router.post("/mentors/apply")
async def apply_mentor(form: MentorApplicationCreate, db: AsyncSession = Depends(get_db)):
    
   
    # 1. Check if email already exists in users
    existing_user = await db.execute(select(User).where(User.email == form.email))
    if existing_user.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
    

    # 2. Check if application already submitted
    existing_app = await db.execute(select(MentorApplication).where(MentorApplication.email == form.email))
    if existing_app.scalar_one_or_none():
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
        status=ApplicationStatusEnum.approved
    )
    db.add(application)
    await db.flush()  # get application.id


    # 4. Auto generate temp password
    temp_password = secrets.token_urlsafe(10)

    # 5. Create User
    new_user = User(
        email=form.email,
        full_name=form.full_name,
        password_hash=hash_password(temp_password),
        role=RoleEnum.mentor,
        gender=form.gender,
        is_active=True,
    )
    db.add(new_user)
    await db.flush()  # get new_user.id


    # 6. Create Mentor profile
    mentor = Mentor(
        user_id=new_user.id,
        gender=form.gender,
        linkedin_url=str(form.linkedin_url) if form.linkedin_url else None,
        employer=form.employer,
        job_title=form.job_title,
        industry=form.industry,
        alma_mater=form.alma_mater,
        county=form.county,
        state=form.state,
        phone_number=form.phone_number,
        service_types=form.service_types,
        major=form.major,
        experience=form.experience,
    )
    db.add(mentor)

    # 7. Link created user back to application
    application.created_user_id = new_user.id

    # 8. Commit everything
    await db.commit()

    try: 
        await send_email(
            subject="Thank You for Your Application - Ummah Professionals",
            recipient=form.email,
            body=f""" <p>Assalamu Alaikum, {form.full_name} </p>
                <p>Thank you for your interest in becoming a Career Advisor with Ummah Professionals. We have received your application. Your account has been created and you should be receiving your credentials in separate email.</p>
                <p>In the meantime, if you have any questions, feel free to reach out to us.</p>
                <p>We appreciate your willingness to give back to the community and look forward to potentially welcoming you to our network of volunteers.</p>
                <p>Jazakum Allahu Khayran,<br>The Ummah Professionals Team</p>
                """
        )
        await send_email(
            subject="Welcome to the Platform! - Ummah Professionals",
            recipient=form.email,
            body=f""" <p>Assalamu Alaikum, {form.full_name} </p>
                <p>Thank you for again for your interest in becoming a Career Advisor with Ummah Professionals.</p>
                <p> Here are your login credentials </p>
                <p>Email: {form.email}</p>
                <p>Password: {temp_password} </p>
                <p>Please log in and change your password after your first login.</p>
                <p>Jazakum Allahu Khayran,<br>The Ummah Professionals Team</p>
                """
        )


    except Exception as e:
        logger.error(f"Failed to send email to {form.email}: {e}")


    return {"message": "Mentor application submitted successfully. Check your email for login credentials.", "application_id": application.id}

@router.get("/mentors/applications")
async def get_mentor_applications(user=Depends(require_admin), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(MentorApplication).where(
            MentorApplication.status == ApplicationStatusEnum.pending
        )
    )
    return result.scalars().all()



# @router.get("/mentor/meetings")
# async def get_mentor_meetings(user=Depends(require_mentor), db: AsyncSession = Depends(get_db)):
    
#     mentor_id = int(user["sub"])
#     result = await db.execute(
#         select(Meeting)
#         .join(MentorAssignment, Meeting.assignment_id == MentorAssignment.id)
#         .where(MentorAssignment.mentor_id == mentor_id)
#         .options(
#             selectinload(Meeting.assignment),
#             selectinload(Meeting.slot),
#         )
#         .order_by(Meeting.start_datetime)
#     )

#     return result.scalars().all()


from app.models.user import User
from app.models.mentor import Mentor
from app.models.enums import RoleEnum, ApplicationStatusEnum
from app.core.security import hash_password
from app.core.deps import require_admin
import secrets

@router.patch("/mentors/applications/{application_id}/review")
async def review_mentor_application(
    application_id: int,
    payload: MentorApplicationReview,
    user=Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    # 1. Fetch the application
    result = await db.execute(
        select(MentorApplication).where(MentorApplication.id == application_id)
    )
    application = result.scalar_one_or_none()

    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    if application.status != ApplicationStatusEnum.pending:
        raise HTTPException(status_code=400, detail="Application has already been reviewed")

    # 2. Update application status
    application.status = payload.status
    application.reviewed_by = int(user["sub"])
    application.reviewed_at = datetime.now(timezone.utc).replace(tzinfo=None)

    # 3. If approved — create user + mentor account
    if payload.status == ApplicationStatusEnum.approved:

        # Check if account already exists
        existing = await db.execute(
            select(User).where(User.email == application.email)
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="An account with this email already exists")

        # Auto-generate temp password
        temp_password = secrets.token_urlsafe(10)

        # Create User
        new_user = User(
            email=application.email,
            full_name=application.full_name,
            password_hash=hash_password(temp_password),
            role=RoleEnum.mentor,
            gender=application.gender,
            is_active=True,
        )
        db.add(new_user)
        await db.flush()  # get new_user.id

        # Create Mentor profile — copy fields from application
        mentor = Mentor(
            user_id=new_user.id,
            gender=application.gender,
            linkedin_url=application.linkedin_url,
            employer=application.employer,
            job_title=application.job_title,
            industry=application.industry,
            alma_mater=application.alma_mater,
            county=application.county,
            state=application.state,
            phone_number=application.phone_number,
            service_types=application.service_types,
        )
        db.add(mentor)

        # Link created user back to application
        application.created_user_id = new_user.id

        await db.commit()

        # Send credentials email
        try:
            await send_email(
                recipient=application.email,
                subject="Your Mentor Account Has Been Approved",
                body=f"""
Hi {application.full_name},

Congratulations! Your mentor application has been approved.

Here are your login credentials:

Email: {application.email}
Password: {temp_password}

Please log in and change your password after your first login.
                """
            )
        except Exception as e:
            logger.error(f"Failed to send approval email to {application.email}: {e}")

    else:
        # Rejected — just commit the status update
        await db.commit()

    return {
        "message": f"Application {payload.status.value} successfully",
        "application_id": application_id,
        "status": payload.status.value
    }