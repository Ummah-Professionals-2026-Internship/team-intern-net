from fastapi import APIRouter, Depends, HTTPException, status
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
from app.core.deps import require_student 
from app.core.calendar import generate_meet_link

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
        student_notes=booking.student_notes  # 👈 This pulls the note from the front-end payload
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

    # 💡 SYSTEM AUTO-GENERATION LAYER: Build a secure, unique Jitsi link on the fly
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

# 👇 NEW CANCELLATION ENDPOINT 👇
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