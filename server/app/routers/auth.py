#Authenticates the user via the database
from fastapi import APIRouter, HTTPException, Depends
from app.core.security import create_token, verify_password

from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db # SQL Async imported and database too

from sqlalchemy import select # Selecting is imported from SQL
from app.models.user import User #User imported from models

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login") #Asks & Receives login req:email & password
async def login(
    email: str,
    password: str,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
    select(User).where(User.email == email) #Searches user via email in users in db
)

    user = result.scalar_one_or_none() 

    if not user:
        raise HTTPException(
            status_code=401,
            detail = "No user found!"
        ) #If no user match found, error
    
    if not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials!"
        ) #If password (gets hashed) doesn't match with stored hashed_password, error


    token = create_token(
    {"sub": str(user.id), "role": user.role.value, }
    )  #Then create a token for user with id & role

    return {
        "access_token": token,
        "token_type": "bearer"
    } #Returns the token

