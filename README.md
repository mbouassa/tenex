# Tenex - AI-Powered Google Drive Q&A

An intelligent document assistant that lets you ask questions about your Google Drive folders using RAG (Retrieval Augmented Generation).

![Tenex Demo](./demo-screenshot.png)

## Features

- **Google OAuth Authentication** — Securely sign in with your Google account
- **Google Drive Integration** — Browse folders with Drive Picker or paste folder links
- **Multi-format Support** — Google Docs, Sheets, Slides, PDFs, and text files
- **Hybrid Search** — Combines dense (semantic) and sparse (keyword) search for better retrieval
- **Reranking** — Uses Cohere's rerank API to improve result relevance
- **Smart Citations** — Document-level citations that link back to source files
- **Real-time Progress** — File-by-file progress indicator during ingestion

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  React + Vite   │────▶│  FastAPI        │────▶│  Qdrant Cloud   │
│  (Frontend)     │     │  (Backend)      │     │  (Vector DB)    │
│                 │     │                 │     │                 │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼            ▼            ▼
              ┌──────────┐ ┌──────────┐ ┌──────────┐
              │ Google   │ │ OpenAI   │ │ Cohere   │
              │ APIs     │ │ API      │ │ API      │
              └──────────┘ └──────────┘ └──────────┘
```

## Tech Stack

### Backend
- **FastAPI** — Modern Python web framework with automatic OpenAPI docs
- **Qdrant** — Vector database for hybrid search (dense + sparse vectors)
- **OpenAI** — `text-embedding-3-small` for dense embeddings, `gpt-4o` for generation
- **Cohere** — `rerank-english-v3.0` for result reranking
- **FastEmbed** — BM25 sparse embeddings for keyword matching
- **PyMuPDF** — PDF text extraction

### Frontend
- **React 18** with TypeScript
- **Vite** — Fast build tool
- **Tailwind CSS** — Utility-first styling
- **Google Drive Picker API** — Native folder selection

## RAG Pipeline

1. **Document Ingestion**
   - Fetch files from Google Drive folder
   - Extract text (Google Docs → plain text, PDFs → PyMuPDF)
   - Chunk text with overlap (1000 chars, 200 overlap)

2. **Hybrid Embedding**
   - Dense: OpenAI `text-embedding-3-small` (1536 dims)
   - Sparse: FastEmbed BM25 for keyword matching

3. **Search & Retrieval**
   - Hybrid query with Reciprocal Rank Fusion (RRF)
   - Cohere reranking for top-k refinement

4. **Generation**
   - Context injection with document numbers
   - GPT-4o generates answer with citations
   - Parse response to extract only used sources

## Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- Google Cloud project with OAuth 2.0 credentials
- Qdrant Cloud account
- OpenAI API key
- Cohere API key

### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Run server
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
echo "VITE_BACKEND_URL=http://localhost:8000" > .env

# Run dev server
npm run dev
```

### Environment Variables

**Backend (.env)**
```
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
OPENAI_API_KEY=your-openai-key
QDRANT_URL=https://your-cluster.qdrant.io
QDRANT_API_KEY=your-qdrant-key
COHERE_API_KEY=your-cohere-key
SECRET_KEY=random-secret-for-sessions
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:8000
```

**Frontend (.env)**
```
VITE_BACKEND_URL=http://localhost:8000
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/auth/login` | Initiate Google OAuth |
| GET | `/auth/callback` | OAuth callback |
| GET | `/auth/me` | Get current user |
| POST | `/auth/logout` | Logout |
| GET | `/drive/ingest-stream` | Ingest folder (SSE) |
| POST | `/chat/ask` | Ask question |

## Design Decisions

### Why Qdrant?
- Native hybrid search support (dense + sparse in one query)
- Cloud-hosted with generous free tier
- Fast RRF fusion without application-level logic

### Why Hybrid Search?
Semantic search alone misses exact keyword matches. Combining dense embeddings with BM25 sparse vectors catches both conceptual similarity and specific terms.

### Why Cohere Rerank?
Initial retrieval is broad — reranking with a cross-encoder model significantly improves the final top-k quality before sending to the LLM.

### Why Document-Level Citations?
Chunk-level citations are confusing for users. Grouping by document and only showing actually-cited sources makes the response more trustworthy.

## Deployment

- **Frontend**: Vercel
- **Backend**: Railway
- **Vector DB**: Qdrant Cloud

## License

MIT
