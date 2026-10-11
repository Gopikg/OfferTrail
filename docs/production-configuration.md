# Production configuration

OfferTrail has separate browser and server configuration so the frontend, API,
and Gmail OAuth callback can use real deployment domains instead of localhost.

## Frontend environment

Copy `frontend/.env.example` to `frontend/.env` and provide the Firebase web
configuration (including `VITE_FIREBASE_STORAGE_BUCKET`) plus `VITE_API_URL`. Vite variables are public browser values;
never put service-account or OAuth secrets in this file.

## Backend environment

Copy `backend/.env.example` to `backend/.env`. In production, set:

- `FRONTEND_URL` to the deployed frontend origin.
- `CORS_ORIGINS` to every permitted frontend origin, comma-separated.
- `GOOGLE_OAUTH_REDIRECT_URI` to the API callback, for example
  `https://api.example.edu/gmail/callback`.
- `GMAIL_OAUTH_SESSION_MINUTES` controls the lifespan of a pending Gmail
  connection; the default is 10 minutes.
- `FIREBASE_SERVICE_ACCOUNT_PATH` to the securely mounted Firebase service
  account JSON file.

## Firebase Console

Enable Firebase Storage for the project before releasing resume uploads, then deploy
the repository's `storage.rules`. The rules allow each signed-in user to access only
their own single resume at `resumes/<uid>/current`, limited to PDF, DOC, or DOCX and
5 MB. The backend creates short-lived documents
under `gmail_oauth_sessions` using the Firebase Admin SDK, so these sessions
remain inaccessible to browser clients. Before releasing, add the deployed frontend domain under **Firebase
Authentication → Settings → Authorized domains**. Redeploy the existing
Firestore rules if the currently deployed rules are older than this repository.

To enable student Google sign-in, open **Firebase Authentication → Sign-in
method**, enable the **Google** provider, select a project support email, and
save. OfferTrail creates a student profile for a new Google account and refuses
Google sign-in for accounts that already have placement-admin or coordinator
access.

## Google Cloud Console

The Gmail OAuth client must list the exact `GOOGLE_OAUTH_REDIRECT_URI` under
**APIs & Services → Credentials → OAuth 2.0 Client IDs → Authorized redirect
URIs**. This is separate from Firebase Console configuration.
