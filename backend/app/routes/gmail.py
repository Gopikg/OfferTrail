from fastapi import APIRouter, HTTPException, Header
from fastapi.responses import RedirectResponse
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from google.auth.exceptions import RefreshError

from firebase_admin import firestore
from app.services.firebase_admin import verify_firebase_token
from app.services.gmail_classifier import classify_job_email
from app.services.gmail_extractor import extract_application_data
from app.services.gmail_message import extract_body
from app.config import (
    FRONTEND_URL,
    GMAIL_MAX_MESSAGES,
    GMAIL_OAUTH_SESSION_MINUTES,
    GOOGLE_OAUTH_REDIRECT_URI,
)

import os
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
# Gmail message retrieval
# ---------------------------------------------------------------------------
def fetch_messages_in_batch(service, messages):
    """Fetch Gmail messages through Gmail's batch endpoint.

    The prior implementation waited for one full-message request before
    starting the next. A batch retains the full payload needed for extraction,
    but turns up to 50 sequential network round trips into one request.
    Individual message failures are skipped so a single inaccessible message
    does not prevent the user from reviewing the rest of the inbox.
    """
    fetched_messages = {}
    failed_message_count = 0

    def handle_response(_request_id, response, exception):
        nonlocal failed_message_count
        if exception is not None:
            print("Failed to fetch Gmail message in batch:", exception)
            failed_message_count += 1
            return

        if response and response.get("id"):
            fetched_messages[response["id"]] = response

    # Gmail batches accept at most 100 requests. Chunking keeps this safe if
    # the configured scan cap is increased.
    for start in range(0, len(messages), 100):
        batch = service.new_batch_http_request(callback=handle_response)
        for message in messages[start:start + 100]:
            batch.add(
                service.users().messages().get(
                    userId="me",
                    id=message["id"],
                    format="full",
                )
            )
        batch.execute()

    return fetched_messages, failed_message_count


# ---------------------------------------------------------------------------
# Gmail messages
# ---------------------------------------------------------------------------

@router.get("/messages")
def get_gmail_messages(
    authorization: str = Header(None),
    page_token: str | None = None,
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
        list_request = service.users().messages().list(
            userId="me",
            q=JOB_EMAIL_QUERY,
            maxResults=GMAIL_MAX_MESSAGES,
            **({"pageToken": page_token} if page_token else {}),
        )
        results = list_request.execute()

        messages = results.get(
            "messages",
            []
        )

        message_data_by_id, failed_message_count = fetch_messages_in_batch(service, messages)
        email_data = []

        # Keep Gmail's list ordering, even though batch responses can arrive
        # in a different order.
        for message in messages:
            message_data = message_data_by_id.get(message["id"])

            if not message_data:
                continue

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

            classification = classify_job_email(subject, sender, body, extracted)
            is_job = classification["is_job_email"]

            if not is_job:
                continue

            email = {
                "id": message["id"],
                "subject": subject,
                "from": sender,
                # Raw mail is processed server-side and never sent to the UI.
                "snippet": message_data.get("snippet", ""),
                "isJobEmail": is_job,
            }

            # Keep the numeric score and its evidence available to the UI for
            # review. ``confidence`` remains the existing low/medium/high API.
            extracted.update(classification)
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
            "hasMoreMessages": bool(results.get("nextPageToken")),
            "nextPageToken": results.get("nextPageToken"),
            "scanLimit": GMAIL_MAX_MESSAGES,
            "failedMessageCount": failed_message_count,
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
