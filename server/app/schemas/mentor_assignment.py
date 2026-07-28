from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.enums import AssignmentStatusEnum
from app.schemas.mentor import MentorResponse
from app.schemas.student import StudentResponse
from app.schemas.student_intake_form import IntakeFormResponse

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



class AssignmentWithIntakeResponse(BaseModel):
    id           : int
    status       : AssignmentStatusEnum
    assigned_at  : datetime
    completed_at : Optional[datetime] = None
    student      : StudentResponse
    intake_form  : IntakeFormResponse

    model_config = {"from_attributes": True}


# --- Capacity tracking (added for mentor-capacity ticket) ---
 
class MentorCapacity(BaseModel):
    mentor_user_id: int
    full_name: str
    capacity: int                   # Mentor.max_monthly_sessions
    assigned_count: int             # non-cancelled assignments in the current cycle
    available_capacity: int         # 0 while on cooldown, else capacity - assigned_count
    cooldown_until: Optional[datetime] = None  # set once capacity is hit; null once cleared
    has_active_assignment: bool     # DB allows only one active assignment per mentor at a time
    at_capacity: bool               # True while now < cooldown_until
    eligible: bool                  # available + no active assignment + not on cooldown