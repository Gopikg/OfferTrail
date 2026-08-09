from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.ai import router as ai_router

app = FastAPI(title="OfferTrail API")
app.include_router(ai_router)

origins = [
    "http://localhost:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "message": "Welcome to OfferTrail!",
        "status": "Backend is running"
    }


@app.get("/api/test")
def test():
    return {
        "project": "OfferTrail",
        "version": "1.0",
        "backend": "FastAPI"
    }