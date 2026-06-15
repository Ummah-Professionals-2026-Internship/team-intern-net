import uvicorn
from fastapi import fastapi
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel # Automatically validates data coming in and formats data going out
from typing import List # May be removed if not needed

app = FastAPI(title="My API")

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


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)