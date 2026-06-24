import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel # Automatically validates data coming in and formats data going out
from typing import List # May be removed if not needed
from app.routers import test
from app.routers import intake
from app.routers import mentors
from sqlalchemy import text
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.schemas import LoginRequest, TokenResponse, LoggedInUser # ignore For demo purpose
from app.models.enums import RoleEnum # Ignore for demo purpose



app = FastAPI()

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173"
    # Add more origins (i.e Ummah Professional links when needed)
]


# React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, # Vite react
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(test.router)
app.include_router(intake.router)
app.include_router(mentors.router)

@app.get("/")
async def root():
    return {"message": "Hello From FastAPI"}


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/db-check")
async def db_check(db: AsyncSession = Depends(get_db)):
    result = await db.execute(text("SELECT 1"))
    return {"db_status": result.scalar()}


# For demo prupose ignore 
@app.post("/demo_login", response_model=TokenResponse)
def login(loginModel: LoginRequest):
    return TokenResponse(
        access_token="token",
        refresh_token="refresh",
        user=LoggedInUser(
            id=1,
            email="example@gmail.com",
            full_name="John Doe",
            role=RoleEnum.student
        )
    )