from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from dotenv import load_dotenv

import os

load_dotenv()

router = APIRouter(prefix="/gmail", tags=["Gmail"])

CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")

REDIRECT_URI = "http://localhost:8000/gmail/callback"

SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly"
]

CLIENT_CONFIG = {
    "web": {
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "redirect_uris": [REDIRECT_URI],
    }
}

# Temporary storage for local development
oauth_data = {}
gmail_credentials = None


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

    # Store the flow so the callback can reuse its PKCE verifier
    oauth_data[state] = flow

    return RedirectResponse(authorization_url)


@router.get("/callback")
async def gmail_callback(code: str, state: str):

    global gmail_credentials

    flow = oauth_data.get(state)

    if flow is None:
        raise HTTPException(
            status_code=400,
            detail="OAuth session expired or invalid."
        )

    try:
        flow.fetch_token(code=code)

        gmail_credentials = flow.credentials

        # We no longer need this OAuth flow
        del oauth_data[state]

        return {
            "message": "Gmail connected successfully!",
            "connected": True,
        }

    except Exception as err:
        print("Gmail OAuth error:", err)

        raise HTTPException(
            status_code=500,
            detail="Failed to connect Gmail."
        )


@router.get("/messages")
async def get_gmail_messages():

    if gmail_credentials is None:
        raise HTTPException(
            status_code=401,
            detail="Gmail is not connected."
        )

    try:
        service = build(
            "gmail",
            "v1",
            credentials=gmail_credentials,
        )

        results = service.users().messages().list(
            userId="me",
            maxResults=10,
        ).execute()

        messages = results.get("messages", [])

        email_data = []

        for message in messages:

            message_data = service.users().messages().get(
                userId="me",
                id=message["id"],
                format="metadata",
                metadataHeaders=["Subject", "From"],
            ).execute()

            headers = message_data.get(
                "payload",
                {}
            ).get(
                "headers",
                []
            )

            subject = ""
            sender = ""

            for header in headers:

                if header["name"] == "Subject":
                    subject = header["value"]

                elif header["name"] == "From":
                    sender = header["value"]

            email_data.append({
                "id": message["id"],
                "subject": subject,
                "from": sender,
            })

        return {
            "count": len(email_data),
            "messages": email_data,
        }

    except Exception as err:

        print("Gmail API error:", err)

        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve Gmail messages."
        )