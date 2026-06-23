from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr
from app.models.enums import ServiceTypeEnum, IntakeFormStatusEnum, EducationLevelEnum, AcademicStandingEnum


# First time submission (no account yet)

class IntakeFormCreate(BaseModel):
    '''
    First-time student intake form submission for users with no existing account.

    Submitting this form triggers three backend operations:
    1. A User + Student record is automatically created from this data
    2. student_id is backfilled on this form record
    3. Login credentials are sent to the student via email

    Note: Before insert the backend checks if email already exists in users.
    If it does the student should be redirected to login to submit via
    IntakeFormReturningCreate instead.
    '''
    # Account creation fields
    full_name         : str
    email             : EmailStr
    gender            : Optional[str] = None
    # Profile fields
    education_level   : EducationLevelEnum
    academic_standing : Optional[AcademicStandingEnum] = None  # only for undergraduates
    major             : Optional[str] = None
    # Request fields
    phone             : Optional[str] = None
    service_type      : ServiceTypeEnum
    desired_career    : Optional[str] = None
    comments          : Optional[str] = None


# Returning student (already has account)

class IntakeFormReturningCreate(BaseModel):
    '''
    Intake form submission for students who already have an account.

    Fields are intentionally minimal — full_name, email, education_level,
    major and academic_standing already exist on the student's profile and
    are not repeated here. Only request-specific fields are collected.
    Student identity is derived from the authenticated user's token,
    not from the request body.
    '''
    phone          : Optional[str] = None
    service_type   : ServiceTypeEnum
    desired_career : Optional[str] = None
    comments       : Optional[str] = None


# Admin status update

class IntakeFormStatusUpdate(BaseModel):
    status: IntakeFormStatusEnum


# Response

class IntakeFormResponse(BaseModel):
    id             : int
    student_id     : Optional[int] = None
    full_name      : Optional[str] = None
    email          : Optional[str] = None
    phone          : Optional[str] = None
    service_type   : ServiceTypeEnum
    desired_career : Optional[str] = None
    major          : Optional[str] = None
    comments       : Optional[str] = None
    status         : IntakeFormStatusEnum
    created_at     : datetime
    updated_at     : datetime

    model_config = {"from_attributes": True}