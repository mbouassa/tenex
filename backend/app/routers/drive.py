from typing import List, Optional

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel

from app.dependencies import get_google_tokens
from app.services.google_drive import (
    parse_folder_id,
    list_folder_files,
    get_folder_info,
)
from app.services.document_processor import process_file
from app.services.chunker import process_files_to_chunks
from app.services.vector_store import store_chunks

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
    has_content: Optional[bool] = None


class ChunkMetadata(BaseModel):
    file_id: str
    file_name: str
    chunk_index: int
    total_chunks: int
    web_view_link: Optional[str] = None


class Chunk(BaseModel):
    text: str
    metadata: ChunkMetadata


class IngestResponse(BaseModel):
    folder_id: str
    folder_name: str
    files: List[FileInfo]
    file_count: int
    chunk_count: int
    processed_file_count: int
    embedded: bool  # Whether chunks were stored in vector DB


@router.post("/ingest", response_model=IngestResponse)
def ingest_folder(body: IngestRequest, request: Request):
    """Ingest a Google Drive folder - download files, extract text, embed and store.
    
    Args:
        body: Contains folder_url (URL or folder ID)
        request: FastAPI request object for accessing cookies
        
    Returns:
        Folder info, files, and embedding status
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
        
        # Process each file (download and extract text)
        processed_files = []
        for f in files:
            file_info = {
                'id': f['id'],
                'name': f['name'],
                'mime_type': f['mimeType'],
                'web_view_link': f.get('webViewLink'),
            }
            processed = process_file(google_tokens, file_info)
            processed_files.append(processed)
        
        # Create chunks from all processed files
        chunks = process_files_to_chunks(processed_files)
        
        # Store chunks in Qdrant with embeddings
        stored_count = store_chunks(folder_id, chunks)
        
        # Transform to response format
        file_list = [
            FileInfo(
                id=f["id"],
                name=f["name"],
                mime_type=f["mimeType"],
                size=f.get("size"),
                modified_time=f.get("modifiedTime"),
                web_view_link=f.get("webViewLink"),
                has_content=next(
                    (p['has_content'] for p in processed_files if p['file_id'] == f['id']),
                    False
                ),
            )
            for f in files
        ]
        
        processed_count = sum(1 for p in processed_files if p.get('has_content'))
        
        return IngestResponse(
            folder_id=folder_id,
            folder_name=folder_info.get("name", "Unknown"),
            files=file_list,
            file_count=len(file_list),
            chunk_count=stored_count,
            processed_file_count=processed_count,
            embedded=stored_count > 0,
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
