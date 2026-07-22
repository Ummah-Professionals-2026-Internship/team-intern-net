#All about the mentor profile
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, HttpUrl, field_validator
from app.models.enums import ServiceTypeEnum
from app.schemas.user import UserResponse

# Personal: full_name, email (n), phone, gender (n), county, state, linkedin
# Education: Major, Alma Mater
# Professional: Employer, Job Title, Industry, Experience Level
# Services
# Bio

class MentorProfileUpdate(BaseModel):

    # Personal
    full_name    : Optional[str] = None
    phone_number : Optional[str] = None
    county       : Optional[str] = None
    state        : Optional[str] = None
    linkedin_url : Optional[HttpUrl] = None
    # Education
    major        : Optional[str] = None
    alma_mater   : Optional[str] = None
    # Professional
    employer     : Optional[str] = None
    job_title    : Optional[str] = None
    industry     : Optional[str] = None
    experience   : Optional[str] = None
    # Services
    service_types : Optional[List[ServiceTypeEnum]] = None
    # Bio
    bio          : Optional[str] = None
    
    @field_validator("service_types")
    @classmethod
    def validate_service_types(cls, v: list | None) -> list | None:
        if v is not None and len(v) == 0:
            raise ValueError("service_types cannot be an empty list if provided")
        return v



class MentorResponse(BaseModel):
    user_id: int
    bio: Optional[str] = None
    linkedin_url: Optional[str] = None
    employer: Optional[str] = None
    job_title: Optional[str] = None
    industry: Optional[str] = None
    phone_number: Optional[str] = None
    experience: Optional[str] = None
    major: Optional[str] = None 
    alma_mater: Optional[str] = None
    county: Optional[str] = None
    state: Optional[str] = None
    service_types: List[ServiceTypeEnum] = []
    is_available: bool
    max_monthly_sessions: int
    created_at: datetime
    updated_at: datetime

    # Nested user info
    user: UserResponse

    model_config = {"from_attributes": True}