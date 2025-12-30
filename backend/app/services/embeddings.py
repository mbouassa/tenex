"""Generate embeddings using OpenAI (dense) and FastEmbed (sparse)."""

from typing import List, Dict

from openai import OpenAI
from fastembed import SparseTextEmbedding

from app.config import settings

# Initialize OpenAI client
client = OpenAI(api_key=settings.openai_api_key)

# Initialize sparse embedding model (SPLADE)
sparse_model = SparseTextEmbedding(model_name="Qdrant/bm25")

# Model to use for dense embeddings
EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMENSIONS = 1536


def get_embedding(text: str) -> List[float]:
    """Get dense embedding for a single text.
    
    Args:
        text: The text to embed
        
    Returns:
        List of floats representing the embedding vector
    """
    response = client.embeddings.create(
        input=text,
        model=EMBEDDING_MODEL,
    )
    return response.data[0].embedding


def get_embeddings_batch(texts: List[str]) -> List[List[float]]:
    """Get dense embeddings for multiple texts in a single API call.
    
    Args:
        texts: List of texts to embed
        
    Returns:
        List of embedding vectors
    """
    if not texts:
        return []
    
    # OpenAI allows up to 2048 texts per batch
    # We'll process in smaller batches to be safe
    batch_size = 100
    all_embeddings = []
    
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        
        response = client.embeddings.create(
            input=batch,
            model=EMBEDDING_MODEL,
        )
        
        # Sort by index to maintain order
        sorted_data = sorted(response.data, key=lambda x: x.index)
        batch_embeddings = [item.embedding for item in sorted_data]
        all_embeddings.extend(batch_embeddings)
    
    return all_embeddings


def get_sparse_embedding(text: str) -> Dict:
    """Get sparse embedding for a single text using BM25.
    
    Args:
        text: The text to embed
        
    Returns:
        Dict with 'indices' and 'values' for sparse vector
    """
    embeddings = list(sparse_model.embed([text]))
    if embeddings:
        emb = embeddings[0]
        return {
            'indices': emb.indices.tolist(),
            'values': emb.values.tolist(),
        }
    return {'indices': [], 'values': []}


def get_sparse_embeddings_batch(texts: List[str]) -> List[Dict]:
    """Get sparse embeddings for multiple texts.
    
    Args:
        texts: List of texts to embed
        
    Returns:
        List of dicts with 'indices' and 'values' for sparse vectors
    """
    if not texts:
        return []
    
    embeddings = list(sparse_model.embed(texts))
    
    result = []
    for emb in embeddings:
        result.append({
            'indices': emb.indices.tolist(),
            'values': emb.values.tolist(),
        })
    
    return result
