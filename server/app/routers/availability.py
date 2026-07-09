from app.core.calendar import create_meet_event
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.db.database import get_db
from app.models.availability_slot import AvailabilitySlot
from app.models.meeting import Meeting
from app.models.mentor_assignment import MentorAssignment
from app.models.enums import AssignmentStatusEnum, MeetingStatusEnum
from app.schemas.availability_slot import AvailabilitySlotResponse
from app.schemas.meeting import MeetingCreate, MeetingResponse
from app.core.email import send_email
from app.schemas.availability_slot import AvailabilitySlotCreate, AvailabilitySlotBulkCreate, AvailabilitySlotBulkResponse
from app.models.mentor import Mentor
from app.models.user import User

router = APIRouter()

# Ticket #54 — View available slots for a mentor
@router.get("/mentors/{mentor_id}/availability", response_model=List[AvailabilitySlotResponse])
async def get_mentor_availability(mentor_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AvailabilitySlot).where(
            AvailabilitySlot.mentor_id == mentor_id,
            AvailabilitySlot.is_booked == False
        )
    )
    slots = result.scalars().all()
    if not slots:
        raise HTTPException(status_code=404, detail="No available slots found for this mentor")
    return slots

# Mentor submits availability slots
@router.post("/mentors/{mentor_id}/availability", response_model=AvailabilitySlotBulkResponse)
async def add_mentor_availability(mentor_id: int, payload: AvailabilitySlotBulkCreate, db: AsyncSession = Depends(get_db)):
    # Check mentor exists
    mentor_result = await db.execute(select(Mentor).where(Mentor.user_id == mentor_id))
    mentor = mentor_result.scalar_one_or_none()
    if not mentor:
        raise HTTPException(status_code=404, detail="Mentor not found")

    slots = []
    for slot_data in payload.slots:
        slot = AvailabilitySlot(
            mentor_id=mentor_id,
            start_datetime=slot_data.start_datetime,
            end_datetime=slot_data.end_datetime
        )
        db.add(slot)
        slots.append(slot)

    await db.commit()
    for slot in slots:
        await db.refresh(slot)

    return AvailabilitySlotBulkResponse(created=len(slots), slots=slots)

# Ticket #55 — Student books a meeting
@router.post("/meetings", response_model=MeetingResponse)
async def book_meeting(booking: MeetingCreate, student_id: int, db: AsyncSession = Depends(get_db)):
    # Get the slot
    slot_result = await db.execute(
        select(AvailabilitySlot).where(AvailabilitySlot.id == booking.slot_id)
    )
    slot = slot_result.scalar_one_or_none()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    if slot.is_booked:
        raise HTTPException(status_code=400, detail="Slot is already booked")

    # Get student's active assignment
    assignment_result = await db.execute(
        select(MentorAssignment).where(
            MentorAssignment.student_id == student_id,
            MentorAssignment.status == AssignmentStatusEnum.active
        )
    )
    assignment = assignment_result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="No active assignment found for this student")

    # Verify slot belongs to assigned mentor
    if slot.mentor_id != assignment.mentor_id:
        raise HTTPException(status_code=403, detail="This slot does not belong to your assigned mentor")

    # Create meeting
    meeting = Meeting(
        assignment_id=assignment.id,
        slot_id=slot.id,
        start_datetime=slot.start_datetime,
        end_datetime=slot.end_datetime,
        status=MeetingStatusEnum.scheduled
    )
    db.add(meeting)

    # Mark slot as booked
    slot.is_booked = True

    await db.commit()
    await db.refresh(meeting)
    await db.refresh(slot)

    # Generate Google Meet link
    student_user_result = await db.execute(select(User).where(User.id == student_id))
    student_user = student_user_result.scalar_one_or_none()

    mentor_user_result = await db.execute(select(User).where(User.id == assignment.mentor_id))
    mentor_user = mentor_user_result.scalar_one_or_none()

    attendees = []
    if student_user:
        attendees.append(student_user.email)
    if mentor_user:
        attendees.append(mentor_user.email)

    meet_link = await create_meet_event(
    title="Career Prep Meeting",
    start_datetime=slot.start_datetime,
    end_datetime=slot.end_datetime
)


    # Store meet link in meeting record
    meeting.meeting_url = meet_link
    await db.commit()
    await db.refresh(meeting)

    meeting_time = slot.start_datetime.strftime("%B %d, %Y at %I:%M %p")

    if student_user:
        await send_email(
            subject="Meeting Scheduled!",
            recipient=student_user.email,
            body="<h2>Hi " + student_user.full_name + ",</h2><p>Your meeting has been scheduled for <strong>" + meeting_time + "</strong>.</p><p><strong>Join here:</strong> <a href='" + meet_link + "'>" + meet_link + "</a></p>"
        )

    if mentor_user:
        await send_email(
            subject="New Meeting Scheduled",
            recipient=mentor_user.email,
            body="<h2>Hi " + mentor_user.full_name + ",</h2><p>A student has booked a meeting with you on <strong>" + meeting_time + "</strong>.</p><p><strong>Join here:</strong> <a href='" + meet_link + "'>" + meet_link + "</a></p>"
        )

    meeting.slot = slot
    return meeting