from datetime import datetime, timezone, timedelta
import uuid
import httpx
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.google_calendar_token import GoogleCalendarToken
from app.models.meeting import Meeting
from app.core.config import settings


GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_CALENDAR_EVENTS_URL = ("https://www.googleapis.com/calendar/v3/calendars/primary/events")


async def get_google_access_token(db: AsyncSession,user_id: int,) -> str:
    """
    Load stored Google refresh token and generate a valid access token.
    """

    result = await db.execute(select(GoogleCalendarToken).where(GoogleCalendarToken.user_id == user_id))
    google_token = result.scalar_one_or_none()

    if not google_token:
        raise HTTPException(
            status_code=400,
            detail="Google Calendar is not connected"
        )


    # If token still valid, reuse it
    if (google_token.token_expiry and google_token.token_expiry > datetime.now(timezone.utc)):
        return google_token.access_token


    # Refresh token
    async with httpx.AsyncClient(timeout=10.0) as client:

        response = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "refresh_token": google_token.refresh_token,
                "grant_type": "refresh_token",
            },
        )


    if response.status_code != 200:
        raise HTTPException(status_code=400, detail="Failed to refresh Google token")


    token_data = response.json()
    google_token.access_token = token_data["access_token"]

    if "expires_in" in token_data:
        google_token.token_expiry = (datetime.now(timezone.utc) + timedelta(seconds=token_data["expires_in"]))

    await db.commit()

    return google_token.access_token




async def create_google_meet_event(db: AsyncSession, admin_id: int, meeting: Meeting,) -> str:
    """
    Creates Google Calendar event and Google Meet conference.
    Returns Meet URL.
    """

    access_token = await get_google_access_token(db, admin_id,)
    assignment = meeting.assignment
    mentor_email = assignment.mentor.user.email
    student_email = assignment.student.user.email

    event_payload = {
        "summary": "Mentorship Meeting",
        "description": ("Scheduled mentorship session"),
        "start": {
            "dateTime": (meeting.slot.start_datetime.isoformat()),
            "timeZone": "America/New_York",
        },
        "end": {
            "dateTime": (meeting.slot.end_datetime.isoformat()),
            "timeZone": "America/New_York",
        },
        "attendees": [{"email": mentor_email}, {"email": student_email},],
        "conferenceData": {
            "createRequest": {"requestId": str(uuid.uuid4())}
        }

    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(
            GOOGLE_CALENDAR_EVENTS_URL,
            params={"conferenceDataVersion": 1},
            headers={
                "Authorization": (f"Bearer {access_token}"),
                "Content-Type": ("application/json"),
            },
            json=event_payload,
        )

    if response.status_code not in (200, 201):
        raise HTTPException(
            status_code=502,
            detail=(
                "Google Calendar event creation failed"
            ),
        )

    event = response.json()
    meet_url = event.get("hangoutLink")


    if not meet_url:
        conference_data = event.get("conferenceData", {})
        for entry in conference_data.get("entryPoints", []):
            if entry.get("entryPointType") == "video":
                meet_url = entry.get("uri")
                break

    if not meet_url:
        raise HTTPException(
            status_code=502,
            detail="Google Meet link was not generated"
        )


    return meet_url