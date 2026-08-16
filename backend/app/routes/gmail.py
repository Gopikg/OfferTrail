from fastapi import APIRouter
from fastapi.responses import RedirectResponse
from google_auth_oauthlib.flow import Flow

router = APIRouter(prefix="/gmail", tags=["Gmail"])

CLIENT_ID = "300622490084-ek0s48s8lb0og5ci8egv8uj8ua3h1qpj.apps.googleusercontent.com"

REDIRECT_URI = "http://localhost:8000/gmail/callback"

SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly"
]

CLIENT_CONFIG = {
    "web": {
        "client_id": CLIENT_ID,
        "client_secret": "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",
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "redirect_uris": [REDIRECT_URI],
    }
}


@router.get("/connect")
async def connect_gmail():
    flow = Flow.from_client_config(
        CLIENT_CONFIG,
        scopes=SCOPES,
    )

    flow.redirect_uri = REDIRECT_URI

    authorization_url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
    )

    return RedirectResponse(authorization_url)


@router.get("/callback")
async def gmail_callback(code: str):
    return {
        "message": "Google OAuth callback received!",
        "code_received": True,
    }