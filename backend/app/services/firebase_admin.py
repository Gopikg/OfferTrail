import firebase_admin
from firebase_admin import credentials, auth
from app.config import FIREBASE_SERVICE_ACCOUNT_PATH

if not firebase_admin._apps:
    cred = credentials.Certificate(FIREBASE_SERVICE_ACCOUNT_PATH)
    firebase_admin.initialize_app(cred)



def verify_firebase_token(id_token):
    return auth.verify_id_token(id_token)
