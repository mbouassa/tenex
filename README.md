# Tenex — AI-Powered Google Drive Q&A

Ask questions about any Google Drive folder. Get instant answers with citations.

> 🚧 **Work in progress** — Full documentation coming soon.

## Quick Start

### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
# Create .env with your credentials
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Backend:** Python, FastAPI
- **Vector DB:** Qdrant
- **AI:** OpenAI (GPT-4o, Embeddings)
- **Auth:** Google OAuth 2.0

