from pydantic import BaseModel, EmailStr
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