from typing import Tuple, Dict

from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from google.oauth2.credentials import Credentials

from app.config import settings

# OAuth scopes we need
SCOPES = [
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/drive.readonly",
]


def get_oauth_flow() -> Flow:
    """Create and return a Google OAuth flow."""
    flow = Flow.from_client_config(
        client_config={
            "web": {
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
                "redirect_uris": [f"{settings.backend_url}/auth/callback"],
            }
        },
        scopes=SCOPES,
    )
    flow.redirect_uri = f"{settings.backend_url}/auth/callback"
    return flow


def get_authorization_url() -> Tuple[str, str]:
    """Generate the Google OAuth authorization URL.
    
    Returns:
        Tuple of (authorization_url, state)
    """
    flow = get_oauth_flow()
    authorization_url, state = flow.authorization_url(
        access_type="offline",  # Get refresh token
        include_granted_scopes="true",
        prompt="consent",  # Force consent screen to get refresh token
    )
    return authorization_url, state


def exchange_code_for_tokens(code: str) -> Dict:
    """Exchange the authorization code for access and refresh tokens.
    
    Args:
        code: The authorization code from Google's callback
        
    Returns:
        Dict containing credentials info
    """
    flow = get_oauth_flow()
    flow.fetch_token(code=code)
    credentials = flow.credentials
    
    return {
        "access_token": credentials.token,
        "refresh_token": credentials.refresh_token,
        "token_uri": credentials.token_uri,
        "client_id": credentials.client_id,
        "client_secret": credentials.client_secret,
        "scopes": list(credentials.scopes),
    }


def get_user_info(access_token: str) -> Dict:
    """Fetch user info from Google using the access token.
    
    Args:
        access_token: The OAuth access token
        
    Returns:
        Dict with user info (email, name, picture)
    """
    credentials = Credentials(token=access_token)
    service = build("oauth2", "v2", credentials=credentials)
    user_info = service.userinfo().get().execute()
    
    return {
        "email": user_info.get("email"),
        "name": user_info.get("name"),
        "picture": user_info.get("picture"),
    }

