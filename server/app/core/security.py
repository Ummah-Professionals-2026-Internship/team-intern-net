from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta, timezone

SECRET_KEY = "dev-secret"
ALGORITHM = "HS256"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str):
    return pwd_context.hash(password)

def verify_password(password: str, hashed: str):
    return pwd_context.verify(password, hashed)


def create_token(data: dict):
    payload = data.copy()
    payload["exp"] = datetime.now(timezone.utc) + timedelta(minutes=60)

    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)