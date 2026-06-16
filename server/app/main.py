import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel # Automatically validates data coming in and formats data going out
from typing import List # May be removed if not needed
from app.routers import test

app = FastAPI()

app.include_router(test.router)

origins = [
    "https://localhost:5173",
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



@app.get("/")
async def root():
    return {"message": "Hello From FastAPI"}


@app.get("/health")
async def health():
    return {"status": "ok"}

