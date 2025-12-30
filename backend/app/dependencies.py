from typing import Dict

from fastapi import Request, HTTPException
from jose import jwt, JWTError

from app.config import settings

ALGORITHM = "HS256"
COOKIE_NAME = "session"


def get_current_session(request: Request) -> Dict:
    """Extract and validate the session from cookies.
    
    Returns the full session payload including user and google_tokens.
    """
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired session")


def get_google_tokens(request: Request) -> Dict:
    """Extract the Google tokens dict from the session."""
    session = get_current_session(request)
    google_tokens = session.get("google_tokens", {})
    
    if not google_tokens.get("access_token"):
        raise HTTPException(status_code=401, detail="No Google access token found")
    
    return google_tokens

