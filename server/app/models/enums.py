import enum


class RoleEnum(str, enum.Enum):
    admin = "admin"
    mentor = "mentor"
    student = "student"


class GenderEnum(str, enum.Enum):
    m = "m"
    f = "f"

class ServiceTypeEnum(str, enum.Enum):
    mock_interview = "mock_interview"
    resume_review = "resume_review"
    career_advice = "career_advice"
    healthcare_service = "healthcare_service"
    mentorship_program = "mentorship_program"


class EducationLevelEnum(str, enum.Enum):
    high_school = "high_school"
    undergraduate = "undergraduate"
    graduate = "graduate"


class AcademicStandingEnum(str, enum.Enum):
    freshman = "freshman"
    sophomore = "sophomore"
    junior = "junior"
    senior = "senior"


class ApplicationStatusEnum(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class IntakeFormStatusEnum(str, enum.Enum):
    submitted = "submitted"
    assigned = "assigned"
    completed = "completed"
    cancelled = "cancelled"


class AssignmentStatusEnum(str, enum.Enum):
    active = "active"
    completed = "completed"
    cancelled = "cancelled"


class MeetingStatusEnum(str, enum.Enum):
    scheduled = "scheduled"
    completed = "completed"
    cancelled = "cancelled"
    no_show = "no_show"
