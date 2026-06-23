from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, HttpUrl, field_validator
from app.models.enums import ServiceTypeEnum
from app.schemas.user import UserResponse


class MentorProfileUpdate(BaseModel):
    bio: Optional[str] = None
    linkedin_url: Optional[HttpUrl] = None
    employer: Optional[str] = None
    job_title: Optional[str] = None
    industry: Optional[str] = None
    alma_mater: Optional[str] = None
    county: Optional[str] = None
    state: Optional[str] = None
    service_types: Optional[List[ServiceTypeEnum]] = None
    is_available: Optional[bool] = None
    max_monthly_sessions: Optional[int] = None

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