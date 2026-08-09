from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/ai", tags=["AI"])


class ApplicationData(BaseModel):
    company: str
    role: str
    stage: str
    deadline: str | None = None
    notes: str | None = None


@router.post("/insight")
async def generate_insight(application: ApplicationData):

    return {
        "insight": (
            f"This application for {application.role} at "
            f"{application.company} is currently at the "
            f"{application.stage} stage."
        )
    }