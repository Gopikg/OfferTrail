from fastapi import APIRouter, HTTPException, Header
from fastapi.responses import RedirectResponse
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from dotenv import load_dotenv

from firebase_admin import firestore
from app.services.firebase_admin import verify_firebase_token
from app.services.gmail_classifier import is_job_email
from app.services.gmail_extractor import extract_application_data

import os
import base64
import json

load_dotenv()

router = APIRouter(prefix="/gmail", tags=["Gmail"])

CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")

REDIRECT_URI = "http://localhost:8000/gmail/callback"

SCOPES = [
    "https://www.googleapis.com/auth/gmail.readonly"
]

# Narrow Gmail's search before loading messages, then apply our own classifier
# below so the client only receives job-application-related mail.
JOB_EMAIL_QUERY = (
    'newer_than:3d '
    '{application applied recruitment recruiter interview interviewing '
    'assessment "coding test" "technical round" "hr round" shortlisted '
    '"hr interview" "human resources" "phone screen" "offer letter" "job offer" '
    'rejected "application status"}'
)

CLIENT_CONFIG = {
    "web": {
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "redirect_uris": [REDIRECT_URI],
    }
}

# Temporary OAuth flow storage.
# The Google credentials themselves are NOT stored here anymore.
oauth_data = {}

db = firestore.client()


def get_bearer_token(authorization):
    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Missing authorization token."
        )

    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Invalid authorization header."
        )

    return authorization.split(" ", 1)[1]


def get_user_from_token(authorization):
    id_token = get_bearer_token(authorization)

    try:
        decoded_token = verify_firebase_token(id_token)
        return decoded_token

    except Exception as err:
        print("Firebase authentication error:", err)

        raise HTTPException(
            status_code=401,
            detail="Invalid Firebase authentication token."
        )


def save_gmail_credentials(uid, credentials):
    data = {
        "token": credentials.token,
        "refresh_token": credentials.refresh_token,
        "token_uri": credentials.token_uri,
        "client_id": credentials.client_id,
        "client_secret": credentials.client_secret,
        "scopes": credentials.scopes,
    }

    db.collection("gmail_connections").document(uid).set(data)


def load_gmail_credentials(uid):
    doc = (
        db.collection("gmail_connections")
        .document(uid)
        .get()
    )

    if not doc.exists:
        return None

    data = doc.to_dict()

    return Credentials(
        token=data.get("token"),
        refresh_token=data.get("refresh_token"),
        token_uri=data.get("token_uri"),
        client_id=data.get("client_id"),
        client_secret=data.get("client_secret"),
        scopes=data.get("scopes"),
    )


@router.post("/connect")
async def connect_gmail(
    authorization: str = Header(None)
):
    user = get_user_from_token(authorization)

    uid = user["uid"]

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

    # Store both the OAuth flow and Firebase UID.
    # This lets the callback know which OfferTrail user
    # owns the resulting Gmail credentials.
    oauth_data[state] = {
        "flow": flow,
        "uid": uid,
    }

    return {
        "authorization_url": authorization_url
    }


@router.get("/callback")
async def gmail_callback(
    code: str,
    state: str
):
    oauth_session = oauth_data.get(state)

    if oauth_session is None:
        raise HTTPException(
            status_code=400,
            detail="OAuth session expired or invalid."
        )

    flow = oauth_session["flow"]
    uid = oauth_session["uid"]

    try:
        flow.fetch_token(code=code)

        credentials = flow.credentials

        save_gmail_credentials(
            uid,
            credentials
        )

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


def decode_body(data):
    if not data:
        return ""

    try:
        decoded = base64.urlsafe_b64decode(
            data.encode("UTF-8")
        )

        return decoded.decode(
            "UTF-8",
            errors="ignore"
        )

    except Exception as err:
        print("Failed to decode email body:", err)
        return ""


def extract_body(payload):
    """
    Extract plain-text content from a Gmail message payload.
    Handles both simple and multipart emails.
    """

    body_data = payload.get(
        "body",
        {}
    ).get("data")

    if body_data:
        return decode_body(body_data)

    parts = payload.get("parts", [])

    for part in parts:

        mime_type = part.get("mimeType", "")

        if mime_type == "text/plain":

            body_data = part.get(
                "body",
                {}
            ).get("data")

            if body_data:
                return decode_body(body_data)

        if part.get("parts"):

            body = extract_body(part)

            if body:
                return body

    return ""


@router.get("/messages")
async def get_gmail_messages(
    authorization: str = Header(None)
):
    user = get_user_from_token(authorization)

    uid = user["uid"]

    credentials = load_gmail_credentials(uid)

    if credentials is None:
        raise HTTPException(
            status_code=401,
            detail="Gmail is not connected."
        )

    try:

        # Refresh the access token if necessary.
        if credentials.expired and credentials.refresh_token:
            credentials.refresh(Request())

            save_gmail_credentials(
                uid,
                credentials
            )

        service = build(
            "gmail",
            "v1",
            credentials=credentials,
        )

        results = service.users().messages().list(
            userId="me",
            q=JOB_EMAIL_QUERY,
            maxResults=50,
        ).execute()

        messages = results.get(
            "messages",
            []
        )

        email_data = []

        for message in messages:

            message_data = service.users().messages().get(
                userId="me",
                id=message["id"],
                format="full",
            ).execute()

            payload = message_data.get(
                "payload",
                {}
            )

            headers = payload.get(
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

            body = extract_body(payload)

            is_job = is_job_email(
                subject,
                sender,
                body,
            )

            if not is_job:
                continue

            email = {
                "id": message["id"],
                "subject": subject,
                "from": sender,
                "body": body,
                "isJobEmail": is_job,
            }

            email["extracted"] = extract_application_data(
                subject,
                sender,
                body
            )

            email_data.append(email)

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
