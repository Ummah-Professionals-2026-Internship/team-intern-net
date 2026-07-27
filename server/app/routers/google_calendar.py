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
from app.core.deps import require_admin
from app.core.google_calendar import create_google_meet_event

from app.models.meeting import Meeting
from app.models.mentor_assignment import MentorAssignment
from app.models.mentor import Mentor
from app.models.student import Student
from app.models.enums import MeetingStatusEnum
from datetime import datetime, timezone, timedelta

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
                selectinload(MentorAssignment.mentor)
                .selectinload(Mentor.user),

                selectinload(MentorAssignment.student)
                .selectinload(Student.user),
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
        await db.refresh(meeting)

    except Exception:
        await db.rollback()
        raise


    # try: 
    #     await send_email(
    #         subject="Thank You for Your Application - Ummah Professionals",
    #         recipient=,
    #         body=f""" <p>Assalamu Alaikum, {form.full_name} </p>
    #             <p>Thank you for your interest in becoming a Career Advisor with Ummah Professionals. We have received your application. Your account has been created and you should be receiving your credentials in separate email.</p>
    #             <p>In the meantime, if you have any questions, feel free to reach out to us.</p>
    #             <p>We appreciate your willingness to give back to the community and look forward to potentially welcoming you to our network of volunteers.</p>
    #             <p>Jazakum Allahu Khayran,<br>The Ummah Professionals Team</p>
    #             """
    #     )


    # except Exception as e:
    #     logger.error(f"Failed to send email to {form.email}: {e}")

    return {
        "message": "Google Meet link generated",
        "meet_url": meet_url,
    }