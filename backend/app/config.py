from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Google OAuth
    google_client_id: str
    google_client_secret: str
    
    # App settings
    frontend_url: str = "http://localhost:5173"
    backend_url: str = "http://localhost:8000"
    
    # Session security (generate a random string for production)
    secret_key: str = "change-this-in-production-use-a-random-string"
    
    # OpenAI
    openai_api_key: str
    
    # Qdrant
    qdrant_url: str
    qdrant_api_key: str
    
    # Cohere (for reranking)
    cohere_api_key: str
    
    class Config:
        env_file = ".env"


settings = Settings()
