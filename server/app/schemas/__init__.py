from .auth import LoginRequest, TokenResponse, LoggedInUser, RefreshTokenRequest
from .user import UserResponse
from .student import StudentProfileUpdate, StudentResponse
from .mentor import MentorProfileUpdate, MentorResponse
from .student_intake_form import IntakeFormCreate, IntakeFormReturningCreate, IntakeFormStatusUpdate, IntakeFormResponse
from .mentor_application import MentorApplicationCreate, MentorApplicationReview, MentorApplicationResponse, ReviewerInfo
from .mentor_assignment import AssignmentCreate, AssignmentStatusUpdate, AssignmentResponse
from .availability_slot import AvailabilitySlotCreate, AvailabilitySlotBulkCreate, AvailabilitySlotResponse, AvailabilitySlotBulkResponse
from .meeting import MeetingCreate, MeetingStatusUpdate, MeetingResponse

'''
    To import any of the schemas into routes:
    from app.schemas import MeetingCreate, # all the necessary schemas
'''


__all__ = [
    # Auth
    "LoginRequest",
    "TokenResponse",
    "LoggedInUser",
    "RefreshTokenRequest",
    # User
    "UserResponse",
    # Student
    "StudentProfileUpdate",
    "StudentResponse",
    # Mentor
    "MentorProfileUpdate",
    "MentorResponse",
    # Intake form
    "IntakeFormCreate",
    "IntakeFormReturningCreate",
    "IntakeFormStatusUpdate",
    "IntakeFormResponse",
    # Mentor application
    "MentorApplicationCreate",
    "MentorApplicationReview",
    "MentorApplicationResponse",
    "ReviewerInfo",
    # Assignment
    "AssignmentCreate",
    "AssignmentStatusUpdate",
    "AssignmentResponse",
    # Availability
    "AvailabilitySlotCreate",
    "AvailabilitySlotBulkCreate",
    "AvailabilitySlotResponse",
    "AvailabilitySlotBulkResponse",
    # Meeting
    "MeetingCreate",
    "MeetingStatusUpdate",
    "MeetingResponse",
]