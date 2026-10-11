from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.ai import router as ai_router
from app.routes.gmail import router as gmail_router
from app.config import CORS_ORIGINS

app = FastAPI(title="OfferTrail API")
app.include_router(ai_router)
app.include_router(gmail_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
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
