import os

from dotenv import load_dotenv


load_dotenv()


def environment_list(name, default):
    value = os.getenv(name, default)
    return [item.strip().rstrip("/") for item in value.split(",") if item.strip()]


FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").rstrip("/")
CORS_ORIGINS = environment_list("CORS_ORIGINS", FRONTEND_URL)
GOOGLE_OAUTH_REDIRECT_URI = os.getenv(
    "GOOGLE_OAUTH_REDIRECT_URI",
    "http://localhost:8000/gmail/callback",
)
GMAIL_OAUTH_SESSION_MINUTES = int(os.getenv("GMAIL_OAUTH_SESSION_MINUTES", "10"))
GMAIL_MAX_MESSAGES = int(os.getenv("GMAIL_MAX_MESSAGES", "100"))
FIREBASE_SERVICE_ACCOUNT_PATH = os.getenv(
    "FIREBASE_SERVICE_ACCOUNT_PATH",
    "firebase-service-account.json",
)
