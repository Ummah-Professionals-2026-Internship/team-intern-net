from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, HttpUrl, field_validator
from app.models.enums import ServiceTypeEnum, ApplicationStatusEnum



# Public mentor application form

class MentorApplicationCreate(BaseModel):
    full_name     : str
    email         : EmailStr
    employer      : Optional[str] = None
    job_title     : Optional[str] = None
    industry      : Optional[str] = None
    experience    : Optional[str] = None
    linkedin_url  : Optional[HttpUrl] = None
    major         : Optional[str] = None
    alma_mater    : Optional[str] = None
    county        : Optional[str] = None
    state         : Optional[str] = None
    other_info    : Optional[str] = None
    service_types : List[ServiceTypeEnum]

    @field_validator("service_types")
    @classmethod
    def validate_service_types(cls, v: list) -> list:
        if not v:
            raise ValueError("At least one service type must be selected")
        return v


# Admin review (approve/reject)

class MentorApplicationReview(BaseModel):
    status: ApplicationStatusEnum


# Nested reviewer info

class ReviewerInfo(BaseModel):
    id        : int
    full_name : str
    email     : EmailStr

    model_config = {"from_attributes": True}


# Response 

class MentorApplicationResponse(BaseModel):
    id              : int
    full_name       : str
    email           : str
    employer        : Optional[str] = None
    job_title       : Optional[str] = None
    industry        : Optional[str] = None
    experience      : Optional[str] = None
    linkedin_url    : Optional[str] = None
    major           : Optional[str] = None
    alma_mater      : Optional[str] = None
    county          : Optional[str] = None
    state           : Optional[str] = None
    other_info      : Optional[str] = None
    service_types   : List[ServiceTypeEnum] = []
    status          : ApplicationStatusEnum
    applied_at      : datetime
    reviewed_at     : Optional[datetime] = None
    reviewed_by     : Optional[int] = None
    created_user_id : Optional[int] = None

    # Nested reviewer — only present after admin reviews
    reviewer : Optional[ReviewerInfo] = None

    model_config = {"from_attributes": True}