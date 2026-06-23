from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer
from jose import jwt
from jose import JWTError

from app.core.config import settings

security = HTTPBearer() #Reads token from requests

def get_current_user(token=Depends(security)):
    try:
        payload = jwt.decode(
            token.credentials,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        ) #This tries to DECODER^ the JWT
        return payload
    except JWTError as e:
        print("JWT ERROR:", e)

    #except Exception:
    #    raise HTTPException(
    #        status_code=401,
    #        detail="Invalid token"
    #    ) #Invalid token