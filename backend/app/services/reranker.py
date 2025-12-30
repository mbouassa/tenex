"""Rerank chunks using Cohere for better relevance."""

from typing import List, Dict

import cohere

from app.config import settings

# Initialize Cohere client
co = cohere.Client(settings.cohere_api_key)


def rerank_chunks(
    query: str,
    chunks: List[Dict],
    top_k: int = 5,
) -> List[Dict]:
    """Rerank chunks using Cohere's reranker.
    
    Args:
        query: The user's question
        chunks: List of chunks from hybrid search
        top_k: Number of top chunks to return
        
    Returns:
        List of reranked chunks (top_k best matches)
    """
    if not chunks:
        return []
    
    # If we have fewer chunks than top_k, just return all
    if len(chunks) <= top_k:
        return chunks
    
    # Extract texts for reranking
    documents = [chunk['text'] for chunk in chunks]
    
    # Call Cohere rerank
    response = co.rerank(
        model="rerank-english-v3.0",
        query=query,
        documents=documents,
        top_n=top_k,
    )
    
    # Get reranked chunks with scores
    reranked = []
    for result in response.results:
        chunk = chunks[result.index].copy()
        chunk['rerank_score'] = result.relevance_score
        reranked.append(chunk)
    
    return reranked

