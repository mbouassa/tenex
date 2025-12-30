from typing import List, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.dependencies import get_google_tokens
from app.services.google_drive import (
    parse_folder_id,
    list_folder_files,
    get_folder_info,
)

router = APIRouter(prefix="/drive", tags=["Google Drive"])


class IngestRequest(BaseModel):
    folder_url: str  # Can be a URL or folder ID


class FileInfo(BaseModel):
    id: str
    name: str
    mime_type: str
    size: Optional[str] = None
    modified_time: Optional[str] = None
    web_view_link: Optional[str] = None


class IngestResponse(BaseModel):
    folder_id: str
    folder_name: str
    files: List[FileInfo]
    file_count: int


@router.post("/ingest", response_model=IngestResponse)
def ingest_folder(body: IngestRequest, request: Request):
    """Ingest a Google Drive folder - parse URL and list all files.
    
    Args:
        body: Contains folder_url (URL or folder ID)
        request: FastAPI request object for accessing cookies
        
    Returns:
        Folder info and list of files
    """
    # Get user's Google tokens from session
    google_tokens = get_google_tokens(request)
    
    # Parse the folder ID from URL
    folder_id = parse_folder_id(body.folder_url)
    if not folder_id:
        raise HTTPException(
            status_code=400, 
            detail="Invalid Google Drive folder URL or ID"
        )
    
    try:
        # Get folder metadata
        folder_info = get_folder_info(google_tokens, folder_id)
        
        # List all files in the folder
        files = list_folder_files(google_tokens, folder_id)
        
        # Transform to response format
        file_list = [
            FileInfo(
                id=f["id"],
                name=f["name"],
                mime_type=f["mimeType"],
                size=f.get("size"),
                modified_time=f.get("modifiedTime"),
                web_view_link=f.get("webViewLink"),
            )
            for f in files
        ]
        
        return IngestResponse(
            folder_id=folder_id,
            folder_name=folder_info.get("name", "Unknown"),
            files=file_list,
            file_count=len(file_list),
        )
        
    except Exception as e:
        # Handle common errors
        error_msg = str(e)
        if "404" in error_msg:
            raise HTTPException(
                status_code=404,
                detail="Folder not found. Make sure you have access to this folder."
            )
        elif "403" in error_msg:
            raise HTTPException(
                status_code=403,
                detail="Access denied. You don't have permission to view this folder."
            )
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Error accessing Google Drive: {error_msg}"
            )

