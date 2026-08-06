import logging
from pathlib import Path
from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List

from app.routers import test
from app.routers import dashboard
from app.routers import matching
from app.routers import auth
from app.routers.student import router as student_router
from app.routers import google_calendar
from app.routers import intake
from app.routers import mentors
from app.routers import availability
from app.routers import mentor_profile
from app.routers import mentor_meetings
from app.routers import mentor_assignments
from sqlalchemy import text
from fastapi import Depends
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.database import get_db
from app.schemas import LoginRequest, TokenResponse, LoggedInUser
from app.models.enums import RoleEnum

from app.matching import rank_mentors

from app.routers import mentor_dash_assignment
from app.routers import change_password
import os

from app.routers import (
    auth,
    availability,
    change_password,
    dashboard,
    google_calendar,
    intake,
    matching,
    mentor_assignments,
    mentor_dash_assignment,
    mentor_meetings,
    mentor_profile,
    mentors,
    test,
)

app = FastAPI(docs_url="/api/docs", redoc_url="/api/redoc", openapi_url="/api/openapi.json")

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    os.getenv("FRONTEND_URL")
]

origins = [o for o in origins if o]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logging.getLogger(__name__).error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}"},
    )

uploads_dir = Path("uploads")
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# All routers under /api prefix
app.include_router(test.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(matching.router, prefix="/api")
app.include_router(intake.router, prefix="/api")
app.include_router(mentors.router, prefix="/api")
app.include_router(availability.router, prefix="/api")
app.include_router(mentor_dash_assignment.router, prefix="/api")
app.include_router(mentor_profile.router, prefix="/api")
app.include_router(mentor_meetings.router, prefix="/api")
app.include_router(google_calendar.router, prefix="/api")
app.include_router(mentor_assignments.router, prefix="/api")
app.include_router(change_password.router, prefix="/api")
app.include_router(student_router, prefix="/api")

@app.get("/")
async def root():
    return {"message": "Hello From FastAPI"}