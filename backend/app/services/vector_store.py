"""Store and search vectors in Qdrant with hybrid search."""

from typing import List, Dict
import uuid

from qdrant_client import QdrantClient, models
from qdrant_client.http.models import (
    Distance,
    VectorParams,
    SparseVectorParams,
    PointStruct,
    SparseVector,
    NamedVector,
    NamedSparseVector,
    Prefetch,
    FusionQuery,
    Fusion,
)

from app.config import settings
from app.services.embeddings import (
    get_embedding,
    get_embeddings_batch,
    get_sparse_embedding,
    get_sparse_embeddings_batch,
    EMBEDDING_DIMENSIONS,
)

# Initialize Qdrant client
qdrant_client = QdrantClient(
    url=settings.qdrant_url,
    api_key=settings.qdrant_api_key,
)

# Vector names
DENSE_VECTOR_NAME = "dense"
SPARSE_VECTOR_NAME = "sparse"


def get_collection_name(folder_id: str) -> str:
    """Generate a collection name from folder ID."""
    return f"folder_{folder_id.replace('-', '_')}"


def create_collection_if_not_exists(folder_id: str) -> str:
    """Create a Qdrant collection for a folder if it doesn't exist.
    
    Args:
        folder_id: Google Drive folder ID
        
    Returns:
        Collection name
    """
    collection_name = get_collection_name(folder_id)
    
    # Check if collection exists
    collections = qdrant_client.get_collections().collections
    collection_names = [c.name for c in collections]
    
    if collection_name not in collection_names:
        qdrant_client.create_collection(
            collection_name=collection_name,
            vectors_config={
                DENSE_VECTOR_NAME: VectorParams(
                    size=EMBEDDING_DIMENSIONS,
                    distance=Distance.COSINE,
                ),
            },
            sparse_vectors_config={
                SPARSE_VECTOR_NAME: SparseVectorParams(),
            },
        )
    
    return collection_name


def delete_collection(folder_id: str) -> bool:
    """Delete a collection for a folder."""
    collection_name = get_collection_name(folder_id)
    
    try:
        qdrant_client.delete_collection(collection_name=collection_name)
        return True
    except Exception:
        return False


def store_chunks(folder_id: str, chunks: List[Dict]) -> int:
    """Store chunks with dense and sparse embeddings in Qdrant.
    
    Args:
        folder_id: Google Drive folder ID
        chunks: List of chunk dicts with 'text' and 'metadata'
        
    Returns:
        Number of chunks stored
    """
    if not chunks:
        return 0
    
    # Create collection if needed
    collection_name = create_collection_if_not_exists(folder_id)
    
    # Clear existing points
    try:
        qdrant_client.delete(
            collection_name=collection_name,
            points_selector=models.FilterSelector(
                filter=models.Filter(must=[])
            ),
        )
    except Exception:
        pass
    
    # Extract texts
    texts = [chunk['text'] for chunk in chunks]
    
    # Get both dense and sparse embeddings
    dense_embeddings = get_embeddings_batch(texts)
    sparse_embeddings = get_sparse_embeddings_batch(texts)
    
    # Create points
    points = []
    for i, (chunk, dense_emb, sparse_emb) in enumerate(zip(chunks, dense_embeddings, sparse_embeddings)):
        point = PointStruct(
            id=str(uuid.uuid4()),
            vector={
                DENSE_VECTOR_NAME: dense_emb,
                SPARSE_VECTOR_NAME: SparseVector(
                    indices=sparse_emb['indices'],
                    values=sparse_emb['values'],
                ),
            },
            payload={
                'text': chunk['text'],
                'file_id': chunk['metadata']['file_id'],
                'file_name': chunk['metadata']['file_name'],
                'chunk_index': chunk['metadata']['chunk_index'],
                'total_chunks': chunk['metadata']['total_chunks'],
                'web_view_link': chunk['metadata'].get('web_view_link'),
            }
        )
        points.append(point)
    
    # Upsert in batches
    batch_size = 100
    for i in range(0, len(points), batch_size):
        batch = points[i:i + batch_size]
        qdrant_client.upsert(
            collection_name=collection_name,
            points=batch,
        )
    
    return len(points)


def search_chunks(
    folder_id: str,
    query: str,
    top_k: int = 5,
) -> List[Dict]:
    """Hybrid search: combine dense and sparse search with RRF fusion.
    
    Args:
        folder_id: Google Drive folder ID
        query: Search query text
        top_k: Number of results to return
        
    Returns:
        List of matching chunks with scores
    """
    collection_name = get_collection_name(folder_id)
    
    # Get both query embeddings
    dense_query = get_embedding(query)
    sparse_query = get_sparse_embedding(query)
    
    # Hybrid search with Reciprocal Rank Fusion
    results = qdrant_client.query_points(
        collection_name=collection_name,
        prefetch=[
            Prefetch(
                query=dense_query,
                using=DENSE_VECTOR_NAME,
                limit=top_k * 2,
            ),
            Prefetch(
                query=SparseVector(
                    indices=sparse_query['indices'],
                    values=sparse_query['values'],
                ),
                using=SPARSE_VECTOR_NAME,
                limit=top_k * 2,
            ),
        ],
        query=FusionQuery(fusion=Fusion.RRF),
        limit=top_k,
    )
    
    # Format results
    chunks = []
    for point in results.points:
        chunks.append({
            'text': point.payload['text'],
            'score': point.score,
            'metadata': {
                'file_id': point.payload['file_id'],
                'file_name': point.payload['file_name'],
                'chunk_index': point.payload['chunk_index'],
                'total_chunks': point.payload['total_chunks'],
                'web_view_link': point.payload.get('web_view_link'),
            }
        })
    
    return chunks
