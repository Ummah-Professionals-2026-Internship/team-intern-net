from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.database import get_db
from app.models.google_calendar_token import GoogleCalendarToken
from app.core.google_oauth import (
    get_google_authorization_url,
    exchange_code_for_tokens,
)
from app.core.deps import require_admin, require_student
from app.core.google_calendar import create_google_meet_event

from app.models.meeting import Meeting
from app.models.mentor_assignment import MentorAssignment
from app.models.mentor import Mentor
from app.models.student import Student
from app.models.enums import MeetingStatusEnum
from datetime import datetime, timezone, timedelta

from app.models.meeting import Meeting
from app.models.availability_slot import AvailabilitySlot
from app.models.mentor_assignment import MentorAssignment
from app.models.mentor import Mentor
from app.models.student import Student
from app.models.enums import AssignmentStatusEnum, MeetingStatusEnum

from app.core.email import send_email
import logging


logger = logging.getLogger(__name__)


router = APIRouter(
    prefix="/google",
    tags=["google-calendar"],
)


@router.get("/connect")
async def connect_google_calendar(
    admin=Depends(require_admin),
):
    user_id = admin["sub"]

    authorization_url = get_google_authorization_url(
        state=user_id
    )

    return RedirectResponse(
        authorization_url
    )


@router.get("/callback")
async def google_callback(
    code: str,
    state: str,
    db: AsyncSession = Depends(get_db),
):
    user_id = int(state)

    # credentials = exchange_code_for_tokens(code)
    token_data = await exchange_code_for_tokens(code)
    if not token_data.get("refresh_token"):
        raise HTTPException(
            status_code=400,
            detail="Google did not provide refresh token",
        )

    result = await db.execute(
        select(GoogleCalendarToken).where(
            GoogleCalendarToken.user_id == user_id
        )
    )

    token_record = result.scalar_one_or_none()

    # Calculate when the access token expires
    # Google returns expires_in in seconds (usually 3600 seconds)

    token_expiry = None

    if token_data.get("expires_in"):
        token_expiry = (
            datetime.now(timezone.utc)
            + timedelta(seconds=token_data["expires_in"])
        )



    if token_record:
        token_record.access_token = token_data["access_token"]
        if token_data.get("refresh_token"):
            token_record.refresh_token = token_data["refresh_token"]

        token_record.token_expiry = token_expiry
    else:
        token_record = GoogleCalendarToken(
            user_id=user_id,
            access_token=token_data["access_token"],
            refresh_token=token_data.get("refresh_token"),
            token_expiry=token_expiry      
        )

        db.add(token_record)

    await db.commit()

    return {
        "message": "Google Calendar connected successfully",
        "user_id": user_id,
        "has_refresh_token": bool(token_data.get("refresh_token")),    
    }



@router.post("/meetings/{meeting_id}/generate-meet-link")
async def generate_meet_link(
    meeting_id: int,
    user=Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    admin_id = int(user["sub"])

    result = await db.execute(
        select(Meeting)
        .where(Meeting.id == meeting_id)
        .options(
            selectinload(Meeting.assignment)
            .options(
                selectinload(MentorAssignment.mentor).selectinload(Mentor.user),
                selectinload(MentorAssignment.student).selectinload(Student.user),
            ),
            selectinload(Meeting.slot),
        )
    )

    meeting = result.scalar_one_or_none()

    if not meeting:
        raise HTTPException(
            status_code=404,
            detail="Meeting not found"
        )

    if meeting.status == MeetingStatusEnum.cancelled:
        raise HTTPException(
            status_code=400,
            detail="Cannot generate Meet link for cancelled meeting"
        )
    # Prevent duplicate Google Calendar events
    if meeting.meeting_url:
        return {
            "message": "Meet link already exists",
            "meet_url": meeting.meeting_url,
        }

    try:
        meet_url = await create_google_meet_event(
            db=db,
            admin_id=admin_id,
            meeting=meeting,
        )

        meeting.meeting_url = meet_url
        await db.commit()

    except Exception as e:
        logger.error(f"Failed to generate Meet link for meeting {meeting_id}: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Failed to generate Google Meet link")


    await db.refresh(meeting)

    try:
        mentor_name = meeting.assignment.mentor.user.full_name
        student_name = meeting.assignment.student.user.full_name
        meeting_date = meeting.start_datetime.strftime("%B %d, %Y")
        meeting_time = meeting.start_datetime.strftime("%I:%M %p")

        await send_email(
            subject="Mentorship Meeting Link Ready – Ummah Professionals",
            recipient=meeting.assignment.student.user.email,
            body=f"""
            <p>Assalamu Alaikum, {student_name},</p>
            <p>Your mentorship meeting link is now ready.</p>
            <p><strong>Mentor:</strong> {mentor_name}</p>
            <p><strong>Date:</strong> {meeting_date}</p>
            <p><strong>Time:</strong> {meeting_time} EST</p>
            <p><strong>Meeting Link:</strong> <a href="{meet_url}">{meet_url}</a></p>
            <br>
            <p>Jazakum Allahu Khayran,</p>
            <p>The Ummah Professionals Team</p>
            """
        )

        await send_email(
            subject="Mentorship Meeting Link Ready – Ummah Professionals",
            recipient=meeting.assignment.mentor.user.email,
            body=f"""
            <p>Assalamu Alaikum, {mentor_name},</p>
            <p>The meeting link for your session with <strong>{student_name}</strong> is now ready.</p>
            <p><strong>Date:</strong> {meeting_date}</p>
            <p><strong>Time:</strong> {meeting_time} EST</p>
            <p><strong>Meeting Link:</strong> <a href="{meet_url}">{meet_url}</a></p>
            <br>
            <p>Jazakum Allahu Khayran,</p>
            <p>The Ummah Professionals Team</p>
            """
        )

    except Exception as e:
        logger.error(f"Failed to send meet link emails for meeting {meeting_id}: {e}")

    return {
        "message": "Google Meet link generated",
        "meet_url": meet_url,
    }





@router.post("/student/meetings/book")
async def book_meeting(
    slot_id: int,
    user=Depends(require_student),
    db: AsyncSession = Depends(get_db),
):
    student_id = int(user["sub"])

    # 1. Get the slot
    slot_result = await db.execute(
        select(AvailabilitySlot).where(
            AvailabilitySlot.id == slot_id,
            AvailabilitySlot.is_booked == False,
        )
    )
    slot = slot_result.scalar_one_or_none()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not available")

    # 2. Check student has active assignment with this mentor
    assignment_result = await db.execute(
        select(MentorAssignment)
        .where(
            MentorAssignment.student_id == student_id,
            MentorAssignment.mentor_id == slot.mentor_id,
            MentorAssignment.status == AssignmentStatusEnum.active,
        )
        .options(
            selectinload(MentorAssignment.mentor).selectinload(Mentor.user),
            selectinload(MentorAssignment.student).selectinload(Student.user),
        )
    )
    assignment = assignment_result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=403, detail="You are not assigned to this mentor")

    # 3. Create meeting
    meeting = Meeting(
        assignment_id=assignment.id,
        slot_id=slot.id,
        start_datetime=slot.start_datetime,
        end_datetime=slot.end_datetime,
        status=MeetingStatusEnum.scheduled,
    )
    db.add(meeting)

    # 4. Mark slot as booked
    slot.is_booked = True

    await db.flush()  # get meeting.id before generating link

    # 5. Load meeting relationships needed for Meet link generation
    await db.refresh(meeting, ["assignment", "slot"])

    # 6. Auto-generate Meet link
    try:
        meet_url = await create_google_meet_event(
            db=db,
            admin_id=assignment.assigned_by,
            meeting=meeting,
        )
        meeting.meeting_url = meet_url
    except Exception as e:
        logger.warning(f"Meet link generation failed for meeting {meeting.id}: {e}")

    await db.commit()
    await db.refresh(meeting)


    # 7. Send confirmation email
    try:
        print(meeting.start_datetime)
        print(meeting.start_datetime.tzinfo)
        mentor_name = assignment.mentor.user.full_name
        student_name = assignment.student.user.full_name
        meeting_date = meeting.start_datetime.strftime("%B %d, %Y")
        meeting_time = meeting.start_datetime.strftime("%I:%M %p")

        email_body = f"""
        <p>Assalamu Alaikum {student_name},</p>
        <p>Your mentorship meeting has been scheduled successfully.</p>
        <p><strong>Mentor:</strong> {mentor_name}</p>
        <p><strong>Date:</strong> {meeting_date}</p>
        <p> The meeting time and link will appear in your Google Calendar invitation. </p>
        {f'<p><strong>Meeting Link:</strong> <a href="{meeting.meeting_url}">{meeting.meeting_url}</a></p>' if meeting.meeting_url else '<p>Your meeting link will be provided shortly.</p>'}
        <br>
        <p>Jazakum Allahu Khayran,</p>
        <p>The Ummah Professionals Team</p>
        """
        # <p><strong>Time:</strong> {meeting_time} EST</p>

        await send_email(
            subject="Mentorship Meeting Confirmed – Ummah Professionals",
            recipient=assignment.student.user.email,
            body=email_body,
        )

        # Also notify mentor
        await send_email(
            subject="New Mentorship Meeting Scheduled – Ummah Professionals",
            recipient=assignment.mentor.user.email,
            body=f"""
            <p>Assalamu Alaikum {mentor_name},</p>
            <p>A meeting has been scheduled with <strong>{student_name}</strong>.</p>
            <p><strong>Date:</strong> {meeting_date}</p>
            <p> The meeting time and link will appear in your Google Calendar invitation. </p>
            {f'<p><strong>Meeting Link:</strong> <a href="{meeting.meeting_url}">{meeting.meeting_url}</a></p>' if meeting.meeting_url else '<p>The meeting link will be added shortly.</p>'}
            <br>
            <p>Jazakum Allahu Khayran,</p>
            <p>The Ummah Professionals Team</p>
            """,
        )
            # <p><strong>Time:</strong> {meeting_time} EST</p>

    except Exception as e:
        logger.warning(f"Failed to send meeting confirmation emails: {e}")

    return {
        "message": "Meeting booked successfully",
        "meeting_id": meeting.id,
        "meeting_url": meeting.meeting_url,
        "start_datetime": meeting.start_datetime,
        "end_datetime": meeting.end_datetime,
    }