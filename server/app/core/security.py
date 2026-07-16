#This file is heart of JWT Token creation & passwd hashing
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta, timezone
from app.core.config import settings

#SECRET_KEY = "dev-secret" #This is the key used to encode JWT
#ALGORITHM = "HS256" #This is the algorithm used to encode JWT

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(password: str, hashed: str):
    return pwd_context.verify(password, hashed)

def create_token(data: dict):
    payload = data.copy()
    payload["exp"] = datetime.now(timezone.utc) + timedelta(minutes=60)

    #return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM) #OLD
    return jwt.encode(
        payload,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM) #NEW ENCODING