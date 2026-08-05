import logging
from pathlib import Path
from fastapi import Depends, FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel # Automatically validates data coming in and formats data going out
from typing import List # May be removed if not needed

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

# Routers
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

# App Core Configuration
app = FastAPI()

# Enhanced CORS Policy (Supports dynamic ports across dev environments)
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Interceptor
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logging.getLogger(__name__).error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}"},
    )

# Static Asset Serving System
uploads_dir = Path("uploads")
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Application Routes Registry
app.include_router(test.router)
app.include_router(dashboard.router)
app.include_router(auth.router)
app.include_router(matching.router)
app.include_router(intake.router)
app.include_router(mentors.router)
app.include_router(availability.router)
app.include_router(mentor_dash_assignment.router)
app.include_router(mentor_profile.router)
app.include_router(mentor_meetings.router)
app.include_router(google_calendar.router)
app.include_router(mentor_assignments.router)
app.include_router(change_password.router)
app.include_router(student_router)

@app.get("/")
async def root():
    return {"message": "Hello From FastAPI"}
