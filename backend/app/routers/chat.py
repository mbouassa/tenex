"""Chat endpoint for RAG-based Q&A."""

import re
from typing import List, Optional, Set, Dict
from collections import defaultdict

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from openai import OpenAI

from app.config import settings
from app.services.vector_store import search_chunks
from app.services.reranker import rerank_chunks

router = APIRouter(prefix="/chat", tags=["Chat"])

# Initialize OpenAI client
client = OpenAI(api_key=settings.openai_api_key)


class ChatRequest(BaseModel):
    folder_id: str
    question: str


class Citation(BaseModel):
    file_name: str
    file_id: str
    web_view_link: Optional[str] = None
    chunk_index: int
    text: str


class ChatResponse(BaseModel):
    answer: str
    citations: List[Citation]


SYSTEM_PROMPT = """You are a helpful assistant that answers questions based on the provided documents.

Instructions:
- Answer the question using ONLY the information from the provided context
- If the context doesn't contain enough information to answer, say so
- Be concise but thorough
- IMPORTANT: When using information from a document, cite it using [1], [2], etc. based on the document number shown
- Only cite documents you actually use in your answer

Context from documents:
{context}
"""


def group_chunks_by_document(chunks: List[dict]) -> Dict[str, List[dict]]:
    """Group chunks by their file_id."""
    grouped = defaultdict(list)
    for chunk in chunks:
        file_id = chunk['metadata']['file_id']
        grouped[file_id].append(chunk)
    return grouped


def build_context_by_document(chunks: List[dict]) -> tuple[str, Dict[int, dict]]:
    """Build context string grouped by document with numbered references.
    
    Returns:
        context: The formatted context string
        doc_map: Mapping from document number (1, 2, 3...) to document metadata
    """
    # Group chunks by document
    grouped = group_chunks_by_document(chunks)
    
    context_parts = []
    doc_map = {}  # doc_number -> {file_id, file_name, web_view_link, best_chunk_text}
    
    for doc_num, (file_id, doc_chunks) in enumerate(grouped.items(), 1):
        # Get metadata from first chunk
        first_chunk = doc_chunks[0]
        file_name = first_chunk['metadata']['file_name']
        web_view_link = first_chunk['metadata'].get('web_view_link')
        
        # Store document info
        doc_map[doc_num] = {
            'file_id': file_id,
            'file_name': file_name,
            'web_view_link': web_view_link,
            'text': first_chunk['text'][:200],  # Best chunk for preview
        }
        
        # Combine all chunks from this document
        chunk_texts = [chunk['text'] for chunk in doc_chunks]
        combined_text = "\n\n".join(chunk_texts)
        
        context_parts.append(f"[{doc_num}] {file_name}:\n{combined_text}")
    
    context = "\n\n---\n\n".join(context_parts)
    return context, doc_map


def extract_citation_numbers(text: str) -> Set[int]:
    """Extract citation numbers from text like [1], [2], [3]."""
    matches = re.findall(r'\[(\d+)\]', text)
    return set(int(m) for m in matches)


@router.post("/ask", response_model=ChatResponse)
async def ask_question(body: ChatRequest):
    """Answer a question about documents in a folder.
    
    Pipeline:
    1. Hybrid search (dense + sparse) to retrieve candidates
    2. Rerank with Cohere for better relevance
    3. Group chunks by document
    4. Send to GPT-4o with context
    5. Parse answer for citation numbers
    6. Return answer with only cited sources
    """
    try:
        # Step 1: Hybrid search - get more candidates for reranking
        initial_chunks = search_chunks(
            folder_id=body.folder_id,
            query=body.question,
            top_k=15,  # Get more for reranking
        )
        
        if not initial_chunks:
            return ChatResponse(
                answer="I couldn't find any relevant information in the documents to answer your question.",
                citations=[],
            )
        
        # Step 2: Rerank to get top 10 most relevant
        reranked_chunks = rerank_chunks(
            query=body.question,
            chunks=initial_chunks,
            top_k=10,
        )
        
        # Step 3: Build context grouped by document
        context, doc_map = build_context_by_document(reranked_chunks)
        
        # Step 4: Call GPT-4o
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT.format(context=context)},
            {"role": "user", "content": body.question},
        ]
        
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            temperature=0.3,
            max_tokens=1000,
        )
        
        answer = response.choices[0].message.content
        
        # Step 5: Extract which document numbers were cited
        cited_numbers = extract_citation_numbers(answer)
        
        # Step 6: Build citations - only include cited documents
        citations = []
        for doc_num in sorted(cited_numbers):
            if doc_num in doc_map:
                doc = doc_map[doc_num]
                citations.append(Citation(
                    file_name=doc['file_name'],
                    file_id=doc['file_id'],
                    web_view_link=doc['web_view_link'],
                    chunk_index=0,  # Not relevant for document-level citations
                    text=doc['text'],
                ))
        
        return ChatResponse(
            answer=answer,
            citations=citations,
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing question: {str(e)}",
        )
