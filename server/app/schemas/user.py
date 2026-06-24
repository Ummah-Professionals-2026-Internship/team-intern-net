from pydantic import BaseModel, EmailStr
from app.models.enums import RoleEnum, GenderEnum


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: RoleEnum
    gender: GenderEnum | None = None
    is_active: bool

    model_config = {"from_attributes": True}