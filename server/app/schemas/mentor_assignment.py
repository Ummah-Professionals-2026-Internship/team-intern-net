from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.enums import AssignmentStatusEnum
from app.schemas.mentor import MentorResponse
from app.schemas.student import StudentResponse


# Admin creates assignment

class AssignmentCreate(BaseModel):
    mentor_id      : int
    student_id     : int
    intake_form_id : int


# Admin updates status

class AssignmentStatusUpdate(BaseModel):
    status: AssignmentStatusEnum


# Response

class AssignmentResponse(BaseModel):
    id             : int
    status         : AssignmentStatusEnum
    assigned_at    : datetime
    completed_at   : Optional[datetime] = None

    # Nested
    mentor      : MentorResponse
    student     : StudentResponse

    model_config = {"from_attributes": True}