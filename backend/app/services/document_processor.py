"""Download and extract text from Google Drive files."""

from typing import Dict, Optional
import io

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload


def get_drive_service(google_tokens: dict):
    """Create a Google Drive API service."""
    credentials = Credentials(
        token=google_tokens.get("access_token"),
        refresh_token=google_tokens.get("refresh_token"),
        token_uri=google_tokens.get("token_uri", "https://oauth2.googleapis.com/token"),
        client_id=google_tokens.get("client_id"),
        client_secret=google_tokens.get("client_secret"),
    )
    return build('drive', 'v3', credentials=credentials)


def download_file_content(google_tokens: dict, file_id: str, mime_type: str) -> Optional[str]:
    """Download a file from Google Drive and extract its text content.
    
    Args:
        google_tokens: User's Google OAuth tokens
        file_id: The Google Drive file ID
        mime_type: The file's MIME type
        
    Returns:
        Extracted text content, or None if unsupported
    """
    service = get_drive_service(google_tokens)
    
    try:
        # Handle Google Workspace files (Docs, Sheets, Slides)
        if mime_type == 'application/vnd.google-apps.document':
            return export_google_doc(service, file_id)
        
        elif mime_type == 'application/vnd.google-apps.spreadsheet':
            return export_google_sheet(service, file_id)
        
        elif mime_type == 'application/vnd.google-apps.presentation':
            return export_google_slides(service, file_id)
        
        # Handle regular files
        elif mime_type == 'application/pdf':
            return download_and_parse_pdf(service, file_id)
        
        elif mime_type in ['text/plain', 'text/markdown', 'text/csv']:
            return download_text_file(service, file_id)
        
        else:
            # Unsupported file type
            return None
            
    except Exception as e:
        print(f"Error processing file {file_id}: {e}")
        return None


def export_google_doc(service, file_id: str) -> str:
    """Export a Google Doc as plain text."""
    content = service.files().export(
        fileId=file_id,
        mimeType='text/plain'
    ).execute()
    
    # Content is returned as bytes
    if isinstance(content, bytes):
        return content.decode('utf-8')
    return str(content)


def export_google_sheet(service, file_id: str) -> str:
    """Export a Google Sheet as CSV and convert to readable text."""
    content = service.files().export(
        fileId=file_id,
        mimeType='text/csv'
    ).execute()
    
    if isinstance(content, bytes):
        csv_text = content.decode('utf-8')
    else:
        csv_text = str(content)
    
    # Convert CSV to more readable format
    lines = csv_text.strip().split('\n')
    if not lines:
        return ""
    
    # Parse header and rows
    result_lines = []
    header = lines[0].split(',') if lines else []
    
    for i, line in enumerate(lines):
        if i == 0:
            result_lines.append(f"Columns: {', '.join(header)}")
            result_lines.append("")
        else:
            values = line.split(',')
            row_text = []
            for j, val in enumerate(values):
                col_name = header[j] if j < len(header) else f"Column {j+1}"
                if val.strip():
                    row_text.append(f"{col_name}: {val.strip()}")
            if row_text:
                result_lines.append(f"Row {i}: {'; '.join(row_text)}")
    
    return '\n'.join(result_lines)


def export_google_slides(service, file_id: str) -> str:
    """Export Google Slides as plain text."""
    content = service.files().export(
        fileId=file_id,
        mimeType='text/plain'
    ).execute()
    
    if isinstance(content, bytes):
        return content.decode('utf-8')
    return str(content)


def download_text_file(service, file_id: str) -> str:
    """Download a plain text file."""
    request = service.files().get_media(fileId=file_id)
    file_buffer = io.BytesIO()
    downloader = MediaIoBaseDownload(file_buffer, request)
    
    done = False
    while not done:
        _, done = downloader.next_chunk()
    
    file_buffer.seek(0)
    return file_buffer.read().decode('utf-8')


def download_and_parse_pdf(service, file_id: str) -> str:
    """Download a PDF and extract text using PyMuPDF."""
    try:
        import fitz  # PyMuPDF
    except ImportError:
        print("PyMuPDF not installed. Skipping PDF processing.")
        return None
    
    # Download PDF
    request = service.files().get_media(fileId=file_id)
    file_buffer = io.BytesIO()
    downloader = MediaIoBaseDownload(file_buffer, request)
    
    done = False
    while not done:
        _, done = downloader.next_chunk()
    
    # Extract text from PDF
    file_buffer.seek(0)
    pdf_bytes = file_buffer.read()
    
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    text_parts = []
    
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        text = page.get_text()
        if text.strip():
            text_parts.append(f"[Page {page_num + 1}]\n{text}")
    
    doc.close()
    return '\n\n'.join(text_parts)


def process_file(google_tokens: dict, file_info: Dict) -> Dict:
    """Process a single file: download and extract text.
    
    Args:
        google_tokens: User's Google OAuth tokens
        file_info: File metadata dict with id, name, mime_type
        
    Returns:
        Dict with file info and extracted content
    """
    file_id = file_info['id']
    mime_type = file_info['mime_type']
    
    content = download_file_content(google_tokens, file_id, mime_type)
    
    return {
        'file_id': file_id,
        'file_name': file_info['name'],
        'mime_type': mime_type,
        'content': content,
        'has_content': content is not None and len(content.strip()) > 0,
        'web_view_link': file_info.get('web_view_link'),
    }

