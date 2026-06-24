from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.enums import MeetingStatusEnum
from app.schemas.availability_slot import AvailabilitySlotResponse


# Student books a meeting

class MeetingCreate(BaseModel):
    '''
    Student books a meeting by selecting an available slot.

    Only slot_id is required — the backend derives everything else:
    - assignment_id from the student's current active assignment
    - start_datetime and end_datetime copied from the slot for email generation
    - availability_slots.is_booked set to TRUE in the same transaction

    Sending more fields from the frontend is intentionally not allowed
    to prevent students from booking outside their assigned mentor's slots.
    '''
    slot_id: int


# Status update (cancel, complete, no show)

class MeetingStatusUpdate(BaseModel):
    status           : MeetingStatusEnum
    cancelled_reason : Optional[str] = None
    meeting_notes    : Optional[str] = None


# Response

class MeetingResponse(BaseModel):
    id               : int
    assignment_id    : int
    meeting_url      : Optional[str] = None
    status           : MeetingStatusEnum
    cancelled_reason : Optional[str] = None
    meeting_notes    : Optional[str] = None
    start_datetime   : datetime
    end_datetime     : datetime
    created_at       : datetime
    updated_at       : datetime

    # Nested slot info
    slot : AvailabilitySlotResponse

    model_config = {"from_attributes": True}