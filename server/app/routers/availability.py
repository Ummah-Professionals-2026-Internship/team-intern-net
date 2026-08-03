import logging
from typing import List, Optional
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload, joinedload

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

from app.core.google_calendar import create_google_meet_event
from app.core.email import send_email
from app.core.deps import require_student, require_mentor 

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Availability & Meetings"])


# ==========================================
# HELPER FUNCTIONS
# ==========================================

async def send_booking_emails(
    student_user: Optional[User], 
    mentor_user: Optional[User], 
    meeting_date: str, 
    meeting_time: str, 
    meet_link: Optional[str]
):
    """Background task to dispatch booking confirmation emails."""
    link_html = (
        f"<p><strong>Meeting Link:</strong> <a href='{meet_link}'>{meet_link}</a></p>" 
        if meet_link else "<p><em>Meeting link will be shared prior to the session.</em></p>"
    )

    if student_user and student_user.email:
        await send_email(
            subject="Your Career Prep Meeting Has Been Scheduled",
            recipient=student_user.email,
            body=(
                f"<h2>Hi {student_user.full_name},</h2>"
                f"<p>Your Career Prep meeting has been scheduled!</p>"
                f"<p><strong>Mentor:</strong> {mentor_user.full_name if mentor_user else 'Your Mentor'}</p>"
                f"<p><strong>Date:</strong> {meeting_date}</p>"
                f"<p><strong>Time:</strong> {meeting_time}</p>"
                f"{link_html}"
                f"<hr><p>Please make sure to join on time and come prepared for your mentorship session.</p>"
            )
        )

    if mentor_user and mentor_user.email:
        await send_email(
            subject="Upcoming Career Prep Mentorship Session",
            recipient=mentor_user.email,
            body=(
                f"<h2>Hi {mentor_user.full_name},</h2>"
                f"<p>You have an upcoming mentorship session scheduled!</p>"
                f"<p><strong>Applicant:</strong> {student_user.full_name if student_user else 'Your Student'}</p>"
                f"<p><strong>Date:</strong> {meeting_date}</p>"
                f"<p><strong>Time:</strong> {meeting_time}</p>"
                f"{link_html}"
            )
        )


# ==========================================
# STUDENT-FACING ENDPOINTS
# ==========================================

@router.get("/mentors/{mentor_id}/availability", response_model=List[AvailabilitySlotResponse])
async def get_mentor_availability(mentor_id: int, db: AsyncSession = Depends(get_db)):
    """Fetch all unbooked availability slots for a specific mentor."""
    result = await db.execute(
        select(AvailabilitySlot).where(
            AvailabilitySlot.mentor_id == mentor_id,
            AvailabilitySlot.is_booked == False
        ).order_by(AvailabilitySlot.start_datetime)
    )
    slots = result.scalars().all()
    if not slots:
        raise HTTPException(status_code=404, detail="No available slots found for this mentor")
    return slots


@router.post("/meetings", response_model=MeetingResponse)
async def book_meeting(
    booking: MeetingCreate, 
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(require_student), 
    db: AsyncSession = Depends(get_db)
):
    """Book an available slot with an assigned mentor and automatically generate Google Meet link."""
    student_id = int(current_user["sub"])

    # 1. Fetch Availability Slot with row lock to prevent race conditions
    slot_result = await db.execute(
        select(AvailabilitySlot)
        .where(AvailabilitySlot.id == booking.slot_id)
        .with_for_update()
    )
    slot = slot_result.scalar_one_or_none()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    if slot.is_booked:
        raise HTTPException(status_code=400, detail="Slot is already booked")

    # 2. Verify Active Mentor Assignment
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

    # 3. Create Meeting Instance & Mark Slot as Booked
    meeting = Meeting(
        assignment_id=assignment.id,
        slot_id=slot.id,
        start_datetime=slot.start_datetime,
        end_datetime=slot.end_datetime,
        status=MeetingStatusEnum.scheduled,
        meeting_url=None,
        student_notes=booking.student_notes
    )
    db.add(meeting)
    slot.is_booked = True

    await db.flush()  # Populate meeting.id for external integration

    # 4. Eagerly load all relationships required for Google Calendar and Pydantic serialization in ONE query
    query = (
        select(Meeting)
        .options(
            joinedload(Meeting.slot),
            joinedload(Meeting.assignment).options(
                selectinload(MentorAssignment.mentor).selectinload(Mentor.user),
                selectinload(MentorAssignment.student),
                selectinload(MentorAssignment.intake_form)
            )
        )
        .where(Meeting.id == meeting.id)
    )
    res = await db.execute(query)
    full_meeting = res.scalar_one()

    # 5. Automatically generate Google Meet URL
    meet_url = None
    try:
        meet_url = await create_google_meet_event(
            db=db,
            admin_id=full_meeting.assignment.assigned_by,
            meeting=full_meeting
        )
        full_meeting.meeting_url = meet_url
    except Exception as e:
        logger.warning(f"Google Meet link generation failed for meeting {full_meeting.id}: {e}")

    # Commit slot update, meeting insertion, and meeting_url update together
    await db.commit()

    # 6. Resolve User objects for Email Notifications
    student_user_result = await db.execute(select(User).where(User.id == student_id))
    student_user = student_user_result.scalar_one_or_none()

    mentor_user = full_meeting.assignment.mentor.user if (
        full_meeting.assignment and full_meeting.assignment.mentor
    ) else None

    meeting_date = slot.start_datetime.strftime("%A, %B %d, %Y")
    meeting_time = f"{slot.start_datetime.strftime('%I:%M %p')} - {slot.end_datetime.strftime('%I:%M %p')} EST"

    # 7. Offload email dispatch to BackgroundTasks
    background_tasks.add_task(
        send_booking_emails, student_user, mentor_user, meeting_date, meeting_time, meet_url
    )

    return full_meeting


@router.delete("/meetings/{meeting_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_meeting(
    meeting_id: int,
    current_user: dict = Depends(require_student),
    db: AsyncSession = Depends(get_db)
):
    """Cancel an existing meeting and release the availability slot."""
    user_id = int(current_user["sub"])

    # 1. Look for target meeting
    meeting_res = await db.execute(select(Meeting).where(Meeting.id == meeting_id))
    meeting = meeting_res.scalar_one_or_none()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting record not found")

    # 2. Authorization check
    assignment_res = await db.execute(
        select(MentorAssignment).where(
            MentorAssignment.id == meeting.assignment_id,
            MentorAssignment.student_id == user_id
        )
    )
    assignment = assignment_res.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=403, detail="Not authorized to alter this meeting context")

    # 3. Release availability slot
    slot_res = await db.execute(select(AvailabilitySlot).where(AvailabilitySlot.id == meeting.slot_id))
    slot = slot_res.scalar_one_or_none()
    if slot:
        slot.is_booked = False

    # 4. Remove meeting record
    await db.delete(meeting)
    await db.commit()
    
    return None


# ==========================================
# MENTOR-FACING ENDPOINTS
# ==========================================

@router.post("/mentor/availability", response_model=AvailabilitySlotBulkResponse)
async def set_availability(
    body: AvailabilitySlotBulkCreate,
    user: dict = Depends(require_mentor),    
    db: AsyncSession = Depends(get_db),
):
    """Bulk create availability slots for a mentor for a given day, replacing existing unbooked ones."""
    mentor_id = int(user["sub"])
    if not body.slots:
        raise HTTPException(status_code=400, detail="No slots provided")
    
    # Check overlaps within payload
    for i, slot in enumerate(body.slots):
        for j, other in enumerate(body.slots):
            if i != j and slot.start_datetime < other.end_datetime and slot.end_datetime > other.start_datetime:
                raise HTTPException(status_code=400, detail="Submitted slots overlap with each other")

    target_date = body.slots[0].start_datetime.date()

    # Clear existing unbooked slots for that target date
    existing = await db.execute(
        select(AvailabilitySlot).where(
            AvailabilitySlot.mentor_id == mentor_id,
            AvailabilitySlot.is_booked == False
        )
    )
    for slot in existing.scalars().all():
        if slot.start_datetime.date() == target_date:
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


@router.get("/mentor/availability", response_model=List[AvailabilitySlotResponse])
async def get_availability(
    month: int,
    year: int,
    user: dict = Depends(require_mentor),    
    db: AsyncSession = Depends(get_db),
):
    """Fetch mentor's availability slots for a given month and year."""
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


@router.delete("/mentor/availability/{slot_id}")
async def delete_slot(
    slot_id: int,
    user: dict = Depends(require_mentor),    
    db: AsyncSession = Depends(get_db),
):
    """Delete an unbooked availability slot."""
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


@router.post("/mentors/{mentor_id}/availability", response_model=AvailabilitySlotBulkResponse)
async def add_mentor_availability(
    mentor_id: int, 
    payload: AvailabilitySlotBulkCreate, 
    db: AsyncSession = Depends(get_db)
):
    """Admin fallback route to append availability slots to a mentor."""
    mentor_result = await db.execute(select(Mentor).where(Mentor.user_id == mentor_id))
    mentor = mentor_result.scalar_one_or_none()
    if not mentor:
        raise HTTPException(status_code=404, detail="Mentor not found")

    slots = [
        AvailabilitySlot(
            mentor_id=mentor_id,
            start_datetime=slot_data.start_datetime,
            end_datetime=slot_data.end_datetime
        )
        for slot_data in payload.slots
    ]
    db.add_all(slots)
    await db.commit()
    
    for slot in slots:
        await db.refresh(slot)

    return AvailabilitySlotBulkResponse(created=len(slots), slots=slots)