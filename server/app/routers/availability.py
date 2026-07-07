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

    return meeting