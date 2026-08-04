from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from app.models.enums import RoleEnum
from app.core.config import settings

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )

        # Optional validation
        if "sub" not in payload or "role" not in payload:
            raise HTTPException(
                status_code=401,
                detail="Invalid token payload"
            )

        return payload

    except JWTError as e:

        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )
    
def require_role(*roles: RoleEnum):
    def guard(user=Depends(get_current_user)):
        if user["role"] not in [r.value for r in roles]:
            raise HTTPException(status_code=403, detail="Forbidden")
        return user
    return guard

require_admin   = require_role(RoleEnum.admin)
require_mentor  = require_role(RoleEnum.mentor)
require_student = require_role(RoleEnum.student)