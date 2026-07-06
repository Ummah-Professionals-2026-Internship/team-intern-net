from datetime import datetime
from typing import List
from pydantic import BaseModel, model_validator


# Single slot

class AvailabilitySlotCreate(BaseModel):
    '''
    A single time window a mentor is marking as available.

    end_datetime > start_datetime is validated at two layers:
    - Pydantic model_validator rejects invalid ranges before hitting the DB
    - PostgreSQL CHECK constraint (chk_slot_valid_duration) as a safety net

    All datetimes should be sent as UTC from the frontend.
    Used individually or as part of AvailabilitySlotBulkCreate for
    setting multiple slots at once.
    '''
    start_datetime : datetime
    end_datetime   : datetime

    @model_validator(mode="after")
    def check_end_after_start(self) -> "AvailabilitySlotCreate":
        if self.end_datetime <= self.start_datetime:
            raise ValueError("end_datetime must be after start_datetime")
        return self


# Bulk Slot

class AvailabilitySlotBulkCreate(BaseModel):
    slots: List[AvailabilitySlotCreate]


# Response

class AvailabilitySlotResponse(BaseModel):
    id             : int
    mentor_id      : int
    start_datetime : datetime
    end_datetime   : datetime
    is_booked      : bool
    created_at     : datetime

    model_config = {"from_attributes": True}


# Bulk Response

class AvailabilitySlotBulkResponse(BaseModel):
    created : int
    slots   : List[AvailabilitySlotResponse]