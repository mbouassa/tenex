"""Chat endpoint for RAG-based Q&A."""

from typing import List, Optional

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
- When referencing information, mention which document it comes from

Context from documents:
{context}
"""


def build_context(chunks: List[dict]) -> str:
    """Build context string from chunks."""
    context_parts = []
    for i, chunk in enumerate(chunks, 1):
        file_name = chunk['metadata']['file_name']
        text = chunk['text']
        context_parts.append(f"[Document {i}: {file_name}]\n{text}")
    
    return "\n\n---\n\n".join(context_parts)


@router.post("/ask", response_model=ChatResponse)
async def ask_question(body: ChatRequest):
    """Answer a question about documents in a folder.
    
    Pipeline:
    1. Hybrid search (dense + sparse) to retrieve candidates
    2. Rerank with Cohere for better relevance
    3. Send to GPT-4o with context
    4. Return answer with citations
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
        
        # Step 2: Rerank to get top 5 most relevant
        reranked_chunks = rerank_chunks(
            query=body.question,
            chunks=initial_chunks,
            top_k=5,
        )
        
        # Step 3: Build prompt and call GPT-4o
        context = build_context(reranked_chunks)
        
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
        
        # Step 4: Build citations from reranked chunks
        citations = [
            Citation(
                file_name=chunk['metadata']['file_name'],
                file_id=chunk['metadata']['file_id'],
                web_view_link=chunk['metadata'].get('web_view_link'),
                chunk_index=chunk['metadata']['chunk_index'],
                text=chunk['text'][:200],  # First 200 chars for preview
            )
            for chunk in reranked_chunks
        ]
        
        return ChatResponse(
            answer=answer,
            citations=citations,
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing question: {str(e)}",
        )

