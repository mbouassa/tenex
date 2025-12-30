import re
from typing import List, Dict, Optional

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from app.config import settings


def parse_folder_id(url_or_id: str) -> Optional[str]:
    """Extract folder ID from a Google Drive URL or return the ID if already an ID.
    
    Supports formats:
    - https://drive.google.com/drive/folders/FOLDER_ID
    - https://drive.google.com/drive/u/0/folders/FOLDER_ID
    - https://drive.google.com/drive/folders/FOLDER_ID?usp=sharing
    - Just the FOLDER_ID directly
    """
    # If it's already just an ID (no slashes or dots), return it
    if re.match(r'^[\w-]+$', url_or_id) and len(url_or_id) > 20:
        return url_or_id
    
    # Try to extract from URL
    patterns = [
        r'drive\.google\.com/drive/(?:u/\d+/)?folders/([a-zA-Z0-9_-]+)',
        r'drive\.google\.com/.*[?&]id=([a-zA-Z0-9_-]+)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url_or_id)
        if match:
            return match.group(1)
    
    return None


def get_drive_service(google_tokens: dict):
    """Create a Google Drive API service using the user's Google tokens."""
    credentials = Credentials(
        token=google_tokens.get("access_token"),
        refresh_token=google_tokens.get("refresh_token"),
        token_uri=google_tokens.get("token_uri", "https://oauth2.googleapis.com/token"),
        client_id=google_tokens.get("client_id"),
        client_secret=google_tokens.get("client_secret"),
    )
    return build('drive', 'v3', credentials=credentials)


def list_folder_files(google_tokens: dict, folder_id: str) -> List[Dict]:
    """List all files in a Google Drive folder.
    
    Args:
        google_tokens: The user's Google OAuth tokens dict
        folder_id: The Google Drive folder ID
        
    Returns:
        List of file metadata dicts
    """
    service = get_drive_service(google_tokens)
    
    files = []
    page_token = None
    
    while True:
        # Query for files in this folder
        response = service.files().list(
            q=f"'{folder_id}' in parents and trashed = false",
            spaces='drive',
            fields='nextPageToken, files(id, name, mimeType, size, modifiedTime, webViewLink)',
            pageToken=page_token,
            pageSize=100,
        ).execute()
        
        files.extend(response.get('files', []))
        
        page_token = response.get('nextPageToken')
        if not page_token:
            break
    
    return files


def get_folder_info(google_tokens: dict, folder_id: str) -> Dict:
    """Get metadata about a folder.
    
    Args:
        google_tokens: The user's Google OAuth tokens dict
        folder_id: The Google Drive folder ID
        
    Returns:
        Folder metadata dict
    """
    service = get_drive_service(google_tokens)
    
    folder = service.files().get(
        fileId=folder_id,
        fields='id, name, mimeType, webViewLink'
    ).execute()
    
    return folder

