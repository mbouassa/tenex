"""Split text into chunks with metadata for RAG."""

from typing import List, Dict


def chunk_text(
    text: str,
    chunk_size: int = 800,
    chunk_overlap: int = 100,
) -> List[str]:
    """Split text into overlapping chunks.
    
    Args:
        text: The text to split
        chunk_size: Target size for each chunk in characters
        chunk_overlap: Number of characters to overlap between chunks
        
    Returns:
        List of text chunks
    """
    if not text or not text.strip():
        return []
    
    # Clean up the text
    text = text.strip()
    
    # If text is shorter than chunk size, return as single chunk
    if len(text) <= chunk_size:
        return [text]
    
    chunks = []
    start = 0
    
    while start < len(text):
        # Calculate end position
        end = start + chunk_size
        
        # If this is not the last chunk, try to break at a sentence or word boundary
        if end < len(text):
            # Look for sentence boundary (., !, ?) within the last 20% of the chunk
            search_start = end - int(chunk_size * 0.2)
            search_region = text[search_start:end]
            
            # Find last sentence boundary
            last_period = max(
                search_region.rfind('. '),
                search_region.rfind('! '),
                search_region.rfind('? '),
                search_region.rfind('.\n'),
                search_region.rfind('!\n'),
                search_region.rfind('?\n'),
            )
            
            if last_period != -1:
                end = search_start + last_period + 1
            else:
                # Fall back to word boundary
                last_space = search_region.rfind(' ')
                if last_space != -1:
                    end = search_start + last_space
        
        # Extract chunk
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        
        # Move start position (with overlap)
        start = end - chunk_overlap
        
        # Prevent infinite loop
        if start >= len(text) - chunk_overlap:
            break
    
    return chunks


def create_chunks_with_metadata(
    content: str,
    file_id: str,
    file_name: str,
    web_view_link: str = None,
    chunk_size: int = 800,
    chunk_overlap: int = 100,
) -> List[Dict]:
    """Create chunks from content with metadata for citation.
    
    Args:
        content: The text content to chunk
        file_id: Google Drive file ID
        file_name: Name of the source file
        web_view_link: URL to view the file in Drive
        chunk_size: Target chunk size
        chunk_overlap: Overlap between chunks
        
    Returns:
        List of chunk dicts with text and metadata
    """
    if not content:
        return []
    
    text_chunks = chunk_text(content, chunk_size, chunk_overlap)
    
    chunks_with_metadata = []
    for i, chunk_text_content in enumerate(text_chunks):
        chunks_with_metadata.append({
            'text': chunk_text_content,
            'metadata': {
                'file_id': file_id,
                'file_name': file_name,
                'chunk_index': i,
                'total_chunks': len(text_chunks),
                'web_view_link': web_view_link,
            }
        })
    
    return chunks_with_metadata


def process_files_to_chunks(
    processed_files: List[Dict],
    chunk_size: int = 800,
    chunk_overlap: int = 100,
) -> List[Dict]:
    """Process multiple files into chunks.
    
    Args:
        processed_files: List of processed file dicts from document_processor
        chunk_size: Target chunk size
        chunk_overlap: Overlap between chunks
        
    Returns:
        List of all chunks from all files
    """
    all_chunks = []
    
    for file_data in processed_files:
        if not file_data.get('has_content'):
            continue
        
        file_chunks = create_chunks_with_metadata(
            content=file_data['content'],
            file_id=file_data['file_id'],
            file_name=file_data['file_name'],
            web_view_link=file_data.get('web_view_link'),
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
        )
        
        all_chunks.extend(file_chunks)
    
    return all_chunks

