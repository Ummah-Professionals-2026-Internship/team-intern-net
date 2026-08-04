from pydantic import BaseModel, EmailStr, Field
from app.models.enums import RoleEnum


# Login
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# Token

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: "LoggedInUser"


class LoggedInUser(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: RoleEnum

    model_config = {"from_attributes": True}


# Refresh

class RefreshTokenRequest(BaseModel):
    refresh_token: str


# Resolve forward reference
TokenResponse.model_rebuild()



class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=8)
    confirm_new_password: str = Field(min_length=8)