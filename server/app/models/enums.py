import enum


class UserType(str, enum.Enum):
    ADMIN = "Admin"
    MENTOR = "Mentor"
    STUDENT = "Student"


class Gender(str, enum.Enum):
    M = "M"
    F = "F"


class MentorStatus(str, enum.Enum):
    ACTIVE = "Active"
    INACTIVE = "Inactive"


class EducationLevel(str, enum.Enum):
    HIGH_SCHOOL = "High school"
    UNDERGRAD = "college undergraduate"
    GRADUATE = "college graduate"


class AcademicStanding(str, enum.Enum):
    FRESHMAN = "Freshman"
    SOPHOMORE = "Sophomore"
    JUNIOR = "Junior"
    SENIOR = "Senior"


class ServiceType(str, enum.Enum):
    MOCK_INTERVIEW = "Mock Interview"
    RESUME_REVIEW = "Resume Review"
    CAREER_ADVICE = "Career Advice"