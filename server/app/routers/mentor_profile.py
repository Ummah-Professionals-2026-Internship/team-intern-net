from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.database import get_db
from app.models.mentor import Mentor
from app.models.user import User
from app.models.mentor_assignment import MentorAssignment
from app.schemas.mentor import MentorProfileUpdate, MentorResponse
from app.models.enums import AssignmentStatusEnum

from app.core.deps import require_mentor
from sqlalchemy.orm import selectinload


router = APIRouter(prefix="/mentor", tags=["mentor-profile"])

@router.get("/profile", response_model=MentorResponse)
async def get_mentor_profile(
    user=Depends(require_mentor),
    db: AsyncSession = Depends(get_db),
):
    mentor_id = int(user["sub"])

    result = await db.execute(
        select(Mentor)
        .where(Mentor.user_id == mentor_id)
        .options(selectinload(Mentor.user))
    )
    mentor = result.scalar_one_or_none()

    if not mentor:
        raise HTTPException(status_code=404, detail="Mentor profile not found")

    return mentor


@router.patch("/profile", response_model=MentorResponse)
async def update_mentor_profile(
    body: MentorProfileUpdate,
    user=Depends(require_mentor),
    db: AsyncSession = Depends(get_db),
):
    mentor_id = int(user["sub"])

    result = await db.execute(
        select(Mentor)
        .where(Mentor.user_id == mentor_id)
        .options(selectinload(Mentor.user))
    )
    mentor = result.scalar_one_or_none()

    if not mentor:
        raise HTTPException(status_code=404, detail="Mentor profile not found")

    # Only update fields that were explicitly provided
    update_data = body.model_dump(exclude_unset=True)

    # Guard — block service_types change if active assignment exists
    # if "service_types" in update_data:
    #     active = await db.execute(
    #         select(MentorAssignment).where(
    #             MentorAssignment.mentor_id == mentor_id,
    #             MentorAssignment.status == AssignmentStatusEnum.active,
    #         )
    #     )
    #     if active.scalar_one_or_none():
    #         raise HTTPException(
    #             status_code=400,
    #             detail="Cannot change service types while you have an active assignment."
    #         )

    # Separate user fields from mentor fields
    user_fields = {"full_name"}

    for field, value in update_data.items():
        if field in user_fields:
            # Update User model
            setattr(mentor.user, field, value)
        elif field == "linkedin_url" and value is not None:
            setattr(mentor, field, str(value))
        else:
            setattr(mentor, field, value)

    await db.commit()
    await db.refresh(mentor)
    return mentor