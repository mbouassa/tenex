from datetime import datetime, timedelta
from typing import Optional, Dict

from fastapi import APIRouter, Response, Request, HTTPException
from fastapi.responses import RedirectResponse
from jose import jwt, JWTError

from app.config import settings
from app.services.google_auth import (
    get_authorization_url,
    exchange_code_for_tokens,
    get_user_info,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

# JWT settings
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7
COOKIE_NAME = "session"


def create_session_token(user_data: dict, google_tokens: dict) -> str:
    """Create a JWT session token containing user info and Google tokens."""
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode = {
        "exp": expire,
        "user": user_data,
        "google_tokens": google_tokens,
    }
    return jwt.encode(to_encode, settings.secret_key, algorithm=ALGORITHM)


def decode_session_token(token: str) -> Optional[Dict]:
    """Decode and validate a session token."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


@router.get("/login")
def login():
    """Redirect user to Google OAuth consent screen."""
    authorization_url, state = get_authorization_url()
    response = RedirectResponse(url=authorization_url)
    # Store state in cookie to verify callback (prevents CSRF)
    response.set_cookie(key="oauth_state", value=state, httponly=True, max_age=600)
    return response


@router.get("/callback")
def callback(code: str, state: str, request: Request):
    """Handle Google OAuth callback after user approves."""
    # Verify state matches (CSRF protection)
    stored_state = request.cookies.get("oauth_state")
    if not stored_state or stored_state != state:
        raise HTTPException(status_code=400, detail="Invalid state parameter")
    
    # Exchange code for tokens
    google_tokens = exchange_code_for_tokens(code)
    
    # Get user info from Google
    user_info = get_user_info(google_tokens["access_token"])
    
    # Create session token
    session_token = create_session_token(user_info, google_tokens)
    
    # Redirect to frontend with session cookie
    response = RedirectResponse(url=settings.frontend_url)
    response.set_cookie(
        key=COOKIE_NAME,
        value=session_token,
        httponly=True,
        secure=False,  # Set to True in production with HTTPS
        samesite="lax",
        max_age=ACCESS_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
    )
    # Clear the oauth_state cookie
    response.delete_cookie(key="oauth_state")
    
    return response


@router.get("/me")
def get_current_user(request: Request):
    """Get the current logged-in user's info."""
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    payload = decode_session_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    
    return {
        "user": payload["user"],
        "authenticated": True,
    }


@router.post("/logout")
def logout(response: Response):
    """Clear the session cookie."""
    response.delete_cookie(key=COOKIE_NAME)
    return {"message": "Logged out successfully"}

