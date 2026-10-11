from fastapi import APIRouter, HTTPException, Header
from fastapi.responses import RedirectResponse
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from google.auth.exceptions import RefreshError

from firebase_admin import firestore
from app.services.firebase_admin import verify_firebase_token
from app.services.gmail_classifier import is_job_email
from app.services.gmail_extractor import extract_application_data
from app.config import (
    FRONTEND_URL,
    GMAIL_OAUTH_SESSION_MINUTES,
    GOOGLE_OAUTH_REDIRECT_URI,
)

import os
import base64
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

router = APIRouter(prefix="/gmail", tags=["Gmail"])

CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")

REDIRECT_URI = GOOGLE_OAUTH_REDIRECT_URI

SCOPES = [
    # Google can return identity scopes already granted to this OAuth client
    # alongside Gmail access. Request them explicitly so oauthlib accepts the
    # callback's complete granted-scope set.
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/gmail.readonly",
]

# Retrieve the recent inbox, then apply our own classifier below. Gmail's
# keyword query used to exclude valid emails that use unfamiliar phrasing.
JOB_EMAIL_QUERY = "newer_than:3d -label:sent"

CLIENT_CONFIG = {
    "web": {
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "redirect_uris": [REDIRECT_URI],
    }
}

db = firestore.client()


# ---------------------------------------------------------------------------
# Authentication helpers
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Gmail credential storage
# ---------------------------------------------------------------------------

def save_gmail_credentials(uid, credentials):
    data = {
        "token": credentials.token,
        "refresh_token": credentials.refresh_token,
        "token_uri": credentials.token_uri,
        "scopes": credentials.scopes,
        "expiry": credentials.expiry,
    }

    db.collection("gmail_connections").document(uid).set(data)


def normalize_utc_datetime(value):
    """Return a UTC-aware datetime for timestamps used by this application."""
    if not isinstance(value, datetime):
        return value

    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)

    return value.astimezone(timezone.utc)


def normalize_google_expiry(value):
    """Return the naive UTC expiry expected by the installed google-auth SDK.

    Firestore returns timestamps with timezone information, whereas
    ``Credentials.expired`` compares its expiry with a naive UTC datetime.
    Normalize the stored value before creating Credentials to prevent a
    TypeError when Gmail messages are requested.
    """
    value = normalize_utc_datetime(value)

    if isinstance(value, datetime):
        return value.replace(tzinfo=None)

    return value


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
        client_id=CLIENT_ID,
        client_secret=CLIENT_SECRET,
        scopes=data.get("scopes"),
        expiry=normalize_google_expiry(data.get("expiry")),
    )


# ---------------------------------------------------------------------------
# OAuth session storage
# ---------------------------------------------------------------------------

def oauth_session_ref(state):
    return db.collection("gmail_oauth_sessions").document(state)


def frontend_gmail_redirect(result):
    query = urlencode({"gmail": result})

    return RedirectResponse(
        url=f"{FRONTEND_URL}/gmail?{query}",
        status_code=303
    )


# ---------------------------------------------------------------------------
# Gmail OAuth connection
# ---------------------------------------------------------------------------

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

    # IMPORTANT:
    #
    # When PKCE is being used, google-auth-oauthlib generates a
    # code_verifier and uses it when constructing the authorization URL.
    #
    # The /callback endpoint runs in a separate request, so the original
    # Flow object no longer exists. We therefore have to persist the
    # verifier alongside the OAuth state.
    #
    # Without this, Google returns:
    #
    #   invalid_grant: Missing code verifier
    #
    oauth_session_ref(state).set({
        "uid": uid,
        "codeVerifier": flow.code_verifier,
        "expiresAt": datetime.now(timezone.utc) + timedelta(
            minutes=GMAIL_OAUTH_SESSION_MINUTES
        ),
    })

    return {
        "authorization_url": authorization_url
    }


# ---------------------------------------------------------------------------
# Gmail OAuth callback
# ---------------------------------------------------------------------------

@router.get("/callback")
async def gmail_callback(
    code: str,
    state: str
):
    session_ref = oauth_session_ref(state)

    oauth_session = session_ref.get()

    if not oauth_session.exists:
        return frontend_gmail_redirect("invalid-session")

    session_data = oauth_session.to_dict()

    expires_at = normalize_utc_datetime(session_data.get("expiresAt"))

    if not expires_at or expires_at <= datetime.now(timezone.utc):
        session_ref.delete()

        return frontend_gmail_redirect("expired-session")

    uid = session_data.get("uid")

    if not uid:
        session_ref.delete()

        return frontend_gmail_redirect("invalid-session")

    # Retrieve the PKCE verifier generated during /connect.
    code_verifier = session_data.get("codeVerifier")

    if not code_verifier:
        session_ref.delete()

        print("Gmail OAuth error: Missing stored code verifier.")

        return frontend_gmail_redirect("invalid-session")

    flow = Flow.from_client_config(
        CLIENT_CONFIG,
        scopes=SCOPES,
        state=state,
    )

    flow.redirect_uri = REDIRECT_URI

    # IMPORTANT:
    #
    # The callback creates a new Flow object, so we must restore the
    # code_verifier that was generated during /connect.
    flow.code_verifier = code_verifier

    try:
        flow.fetch_token(code=code)

        credentials = flow.credentials

        save_gmail_credentials(
            uid,
            credentials
        )

        return frontend_gmail_redirect("connected")

    except Exception as err:
        print("Gmail OAuth error:", err)

        return frontend_gmail_redirect("connection-failed")

    finally:
        # OAuth state and verifier are single-use.
        session_ref.delete()


# ---------------------------------------------------------------------------
# Gmail message decoding
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Gmail messages
# ---------------------------------------------------------------------------

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

        # Gmail performs the initial server-side filtering here.
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

            extracted = extract_application_data(subject, sender, body)

            is_job = is_job_email(subject, sender, body, extracted)

            if not is_job:
                continue

            email = {
                "id": message["id"],
                "subject": subject,
                "from": sender,
                "body": body,
                "isJobEmail": is_job,
            }

            email["extracted"] = extracted

            email_data.append(email)

        # An empty Gmail search is a valid result.
        #
        # Example:
        #
        # {
        #     "count": 0,
        #     "messages": []
        # }
        #
        # This is NOT an error.
        return {
            "count": len(email_data),
            "messages": email_data,
        }

    except RefreshError as err:

        # Google has rejected the stored refresh token.
        # This normally means the user revoked Gmail access or the
        # credential is otherwise no longer valid.
        print("Gmail token refresh error:", err)

        raise HTTPException(
            status_code=401,
            detail="Gmail authorization has expired or been revoked. Please reconnect Gmail."
        )

    except Exception as err:

        print("Gmail API error:", err)

        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve Gmail messages."
        )
