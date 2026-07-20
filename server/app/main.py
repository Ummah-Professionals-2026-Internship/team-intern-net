#Runs the actual app

import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel # Automatically validates data coming in and formats data going out
from typing import List # May be removed if not needed
from app.routers import test
from app.routers import dashboard
from app.routers import matching
from app.routers import auth

from app.routers import intake
from app.routers import mentors
from sqlalchemy import text
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.schemas import LoginRequest, TokenResponse, LoggedInUser # ignore For demo purpose
from app.models.enums import RoleEnum # Ignore for demo purpose

from app.matching import rank_mentors #Matching algorithm


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

app.include_router(dashboard.router)
app.include_router(auth.router)
app.include_router(matching.router)

app.include_router(intake.router)
app.include_router(mentors.router)

@app.get("/")
async def root():
    return {"message": "Hello From FastAPI"}

