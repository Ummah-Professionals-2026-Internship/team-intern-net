from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from typing import List
from datetime import datetime, timezone

from app.db.database import get_db
from app.models.availability_slot import AvailabilitySlot
from app.models.meeting import Meeting
from app.models.mentor_assignment import MentorAssignment
from app.models.mentor import Mentor
from app.models.user import User
from app.models.enums import AssignmentStatusEnum, MeetingStatusEnum

from app.schemas.availability_slot import (
    AvailabilitySlotResponse, 
    AvailabilitySlotCreate, 
    AvailabilitySlotBulkCreate, 
    AvailabilitySlotBulkResponse
)
from app.schemas.meeting import MeetingCreate, MeetingResponse

from app.core.email import send_email
from app.core.deps import require_student, require_mentor 
from app.core.calendar import generate_meet_link

router = APIRouter(tags=["Availability & Meetings"])

# ==========================================
# STUDENT-FACING ENDPOINTS
# ==========================================

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

# Ticket #55 — Student books a meeting
@router.post("/meetings", response_model=MeetingResponse)
async def book_meeting(
    booking: MeetingCreate, 
    current_user: dict = Depends(require_student), 
    db: AsyncSession = Depends(get_db)
):
    student_id = int(current_user["sub"])

    slot_result = await db.execute(
        select(AvailabilitySlot).where(AvailabilitySlot.id == booking.slot_id)
    )
    slot = slot_result.scalar_one_or_none()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    if slot.is_booked:
        raise HTTPException(status_code=400, detail="Slot is already booked")

    assignment_result = await db.execute(
        select(MentorAssignment).where(
            MentorAssignment.student_id == student_id,
            MentorAssignment.status == AssignmentStatusEnum.active
        )
    )
    assignment = assignment_result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="No active assignment found for this student")

    if slot.mentor_id != assignment.mentor_id:
        raise HTTPException(status_code=403, detail="This slot does not belong to your assigned mentor")

    meeting = Meeting(
        assignment_id=assignment.id,
        slot_id=slot.id,
        start_datetime=slot.start_datetime,
        end_datetime=slot.end_datetime,
        status=MeetingStatusEnum.scheduled,
        student_notes=booking.student_notes  # Pulls the notes from frontend payload
    )
    db.add(meeting)
    slot.is_booked = True

    await db.commit()
    await db.refresh(meeting)
    await db.refresh(slot)

    student_user_result = await db.execute(select(User).where(User.id == student_id))
    student_user = student_user_result.scalar_one_or_none()

    mentor_user_result = await db.execute(select(User).where(User.id == assignment.mentor_id))
    mentor_user = mentor_user_result.scalar_one_or_none()

    attendees = []
    if student_user:
        attendees.append(student_user.email)
    if mentor_user:
        attendees.append(mentor_user.email)

    # SYSTEM AUTO-GENERATION LAYER: Build a secure, unique Jitsi link on the fly
    meet_link = generate_meet_link()

    meeting.meeting_url = meet_link
    await db.commit()
    await db.refresh(meeting)

    meeting_date = slot.start_datetime.strftime("%A, %B %d, %Y")
    meeting_time = slot.start_datetime.strftime("%I:%M %p") + " - " + slot.end_datetime.strftime("%I:%M %p") + " EST"

    if student_user:
        await send_email(
            subject="Your Career Prep Meeting Has Been Scheduled",
            recipient=student_user.email,
            body="<h2>Hi " + student_user.full_name + ",</h2><p>Your Career Prep meeting has been scheduled!</p><p><strong>Mentor:</strong> " + (mentor_user.full_name if mentor_user else 'Your Mentor') + "</p><p><strong>Date:</strong> " + meeting_date + "</p><p><strong>Time:</strong> " + meeting_time + "</p><p><strong>Meeting Link:</strong> <a href='" + meet_link + "'>" + meet_link + "</a></p><hr><p>Please make sure to join on time and come prepared for your mentorship session.</p>"
        )

    if mentor_user:
        await send_email(
            subject="Upcoming Career Prep Mentorship Session",
            recipient=mentor_user.email,
            body="<h2>Hi " + mentor_user.full_name + ",</h2><p>You have an upcoming mentorship session scheduled!</p><p><strong>Applicant:</strong> " + (student_user.full_name if student_user else 'Your Student') + "</p><p><strong>Date:</strong> " + meeting_date + "</p><p><strong>Time:</strong> " + meeting_time + "</p><p><strong>Meeting Link:</strong> <a href='" + meet_link + "'>" + meet_link + "</a></p>"
        )

    meeting.slot = slot
    return meeting

# NEW CANCELLATION ENDPOINT
@router.delete("/meetings/{meeting_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_meeting(
    meeting_id: int,
    current_user: dict = Depends(require_student),
    db: AsyncSession = Depends(get_db)
):
    user_id = int(current_user["sub"])

    # 1. Look for the target meeting
    meeting_res = await db.execute(select(Meeting).where(Meeting.id == meeting_id))
    meeting = meeting_res.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting record not found")

    # 2. Check if the meeting belongs to this student's assignment
    assignment_res = await db.execute(
        select(MentorAssignment).where(
            MentorAssignment.id == meeting.assignment_id,
            MentorAssignment.student_id == user_id
        )
    )
    assignment = assignment_res.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=403, detail="Not authorized to alter this meeting context")

    # 3. Release the availability slot back to the mentor's open pool
    slot_res = await db.execute(select(AvailabilitySlot).where(AvailabilitySlot.id == meeting.slot_id))
    slot = slot_res.scalar_one_or_none()
    if slot:
        slot.is_booked = False
        db.add(slot)

    # 4. Remove the meeting record from the database table
    await db.delete(meeting)
    await db.commit()
    
    return None


# ==========================================
# MENTOR-FACING ENDPOINTS
# ==========================================

# Mentor submits availability slots (authenticated context)
@router.post("/mentor/availability", response_model=AvailabilitySlotBulkResponse)
async def set_availability(
    body: AvailabilitySlotBulkCreate,
    user: dict = Depends(require_mentor),    
    db: AsyncSession = Depends(get_db),
):
    mentor_id = int(user["sub"])
    if not body.slots:
        raise HTTPException(status_code=400, detail="No slots provided")
    
    # Check for duplicates within the submitted slots themselves
    for i, slot in enumerate(body.slots):
        for j, other in enumerate(body.slots):
            if i != j and slot.start_datetime < other.end_datetime and slot.end_datetime > other.start_datetime:
                raise HTTPException(status_code=400, detail="Submitted slots overlap with each other")

    date = body.slots[0].start_datetime.date()

    existing = await db.execute(
        select(AvailabilitySlot).where(
            AvailabilitySlot.mentor_id == mentor_id,
            AvailabilitySlot.is_booked == False
        )
    )
    for slot in existing.scalars().all():
        if slot.start_datetime.date() == date:
            await db.delete(slot)

    new_slots = [
        AvailabilitySlot(
            mentor_id=mentor_id,
            start_datetime=s.start_datetime,
            end_datetime=s.end_datetime,
        )
        for s in body.slots
    ]
    db.add_all(new_slots)
    await db.commit()
    for slot in new_slots:
        await db.refresh(slot)

    return AvailabilitySlotBulkResponse(created=len(new_slots), slots=new_slots)

# Mentor fetches their own schedules sorted by month/year
@router.get("/mentor/availability", response_model=List[AvailabilitySlotResponse])
async def get_availability(
    month: int,
    year: int,
    user: dict = Depends(require_mentor),    
    db: AsyncSession = Depends(get_db),
):
    mentor_id = int(user["sub"])
    start = datetime(year, month, 1, tzinfo=timezone.utc)
    
    if month == 12:
        end = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        end = datetime(year, month + 1, 1, tzinfo=timezone.utc)

    result = await db.execute(
        select(AvailabilitySlot)
        .where(
            AvailabilitySlot.mentor_id == mentor_id,
            AvailabilitySlot.start_datetime >= start,
            AvailabilitySlot.start_datetime < end,
        )
        .order_by(AvailabilitySlot.start_datetime)
    )
    return result.scalars().all()

# Mentor deletes an unbooked availability slot
@router.delete("/mentor/availability/{slot_id}")
async def delete_slot(
    slot_id: int,
    user: dict = Depends(require_mentor),    
    db: AsyncSession = Depends(get_db),
):
    mentor_id = int(user["sub"])
    result = await db.execute(
        select(AvailabilitySlot).where(
            AvailabilitySlot.id == slot_id,
            AvailabilitySlot.mentor_id == mentor_id,
        )
    )
    slot = result.scalar_one_or_none()

    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    if slot.is_booked:
        raise HTTPException(status_code=400, detail="Cannot delete a booked slot")

    await db.delete(slot)
    await db.commit()
    return {"message": "Slot deleted successfully"}

# Fallback route for alternate/admin mentor ID manual creation queries
@router.post("/mentors/{mentor_id}/availability", response_model=AvailabilitySlotBulkResponse)
async def add_mentor_availability(mentor_id: int, payload: AvailabilitySlotBulkCreate, db: AsyncSession = Depends(get_db)):
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