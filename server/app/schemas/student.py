from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.models.enums import EducationLevelEnum, AcademicStandingEnum
from app.schemas.user import UserResponse


class StudentProfileUpdate(BaseModel):
    major: Optional[str] = None
    education_level: Optional[EducationLevelEnum] = None
    academic_standing: Optional[AcademicStandingEnum] = None
    resume_url: Optional[str] = None


class StudentResponse(BaseModel):
    user_id: int
    major: Optional[str] = None
    education_level: Optional[EducationLevelEnum] = None
    academic_standing: Optional[AcademicStandingEnum] = None
    resume_url: Optional[str] = None
    resume_uploaded_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    # Nested user info
    user: UserResponse

    model_config = {"from_attributes": True}