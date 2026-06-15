from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="My API")


# React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], # Vite react
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Hello From FastAPI"}