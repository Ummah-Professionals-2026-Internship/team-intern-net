from fastapi import APIRouter, HTTPException
from app.core.security import create_token
from app.mock_users import MOCK_USERS #Change l8r with database

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/login") #Asks & Receives login req:email & password
async def login(email: str, password: str):

    user = next(
    ( 
        u for u in MOCK_USERS
        if u["email"] == email and u["password"] == password
    ), None) #Finds user in mock users, replace SQL

    if not user:
        raise HTTPException(
            status_code=401,
            detail = "Invalid credentials"
        ) #If no match found, no user
    
    token = create_token(
        {"sub": user["id"], "role": user["role"].value}
    ) #Then create a token for user with id & role

    return {
        "access_token": token,
        "token_type": "bearer"
    } #Return token

