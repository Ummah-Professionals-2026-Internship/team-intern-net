from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.db.database import get_db
from app.models.meeting import Meeting
from app.models.mentor_assignment import MentorAssignment
from app.models.availability_slot import AvailabilitySlot
from app.models.mentor import Mentor
from app.models.enums import MeetingStatusEnum, AssignmentStatusEnum
from app.core.deps import require_mentor
from app.schemas.meeting import MeetingResponse
from app.models.student import Student

import logging
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/mentor/meetings", response_model=list[MeetingResponse])
async def get_mentor_meetings(
    user=Depends(require_mentor),
    db: AsyncSession = Depends(get_db)
):
    mentor_id = int(user["sub"])

    result = await db.execute(
        select(Meeting)
        .join(MentorAssignment, Meeting.assignment_id == MentorAssignment.id)
        .where(MentorAssignment.mentor_id == mentor_id)
        .options(
            selectinload(Meeting.assignment).options(
                selectinload(MentorAssignment.student).selectinload(Student.user),
                selectinload(MentorAssignment.intake_form),
            ),
            selectinload(Meeting.slot),
        )
        .order_by(Meeting.start_datetime)
    )
    meetings = result.scalars().all()

    return meetings 


@router.patch("/mentor/meetings/{meeting_id}/status")
async def update_meeting_status(
    meeting_id: int,
    user=Depends(require_mentor),
    db: AsyncSession = Depends(get_db),
):
    mentor_id = int(user["sub"])

    result = await db.execute(
        select(Meeting)
        .join(MentorAssignment, Meeting.assignment_id == MentorAssignment.id)
        .where(
            Meeting.id == meeting_id,
            MentorAssignment.mentor_id == mentor_id,
        )
        .options(selectinload(Meeting.slot))
    )
    meeting = result.scalar_one_or_none()

    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    if meeting.status != MeetingStatusEnum.scheduled:
        raise HTTPException(status_code=400, detail="Only scheduled meetings can be updated")

    return meeting