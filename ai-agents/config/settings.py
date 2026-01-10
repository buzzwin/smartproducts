"""Application settings and configuration."""
import os
from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings."""
    
    # AI Configuration
    gemini_api_key: Optional[str] = os.getenv("GEMINI_API_KEY") or os.getenv("EMAIL_AGENT_AI_API_KEY")
    email_agent_ai_model: str = os.getenv("EMAIL_AGENT_AI_MODEL", "gemini-3-flash-preview")
    
    # Gmail Configuration
    gmail_credentials_path: Optional[str] = os.getenv("GMAIL_CREDENTIALS_PATH")
    gmail_token_path: Optional[str] = os.getenv("GMAIL_TOKEN_PATH")
    gmail_oauth_redirect_uri: Optional[str] = os.getenv("GMAIL_OAUTH_REDIRECT_URI")
    
    # Database Configuration
    database_url: Optional[str] = os.getenv("DATABASE_URL")
    database_type: str = os.getenv("DATABASE_TYPE", "sqlite")  # sqlite, mongodb, or sql
    
    # Encryption
    encryption_key: Optional[str] = os.getenv("ENCRYPTION_KEY")
    
    # API Configuration
    api_host: str = os.getenv("API_HOST", "0.0.0.0")
    api_port: int = int(os.getenv("API_PORT", "8001"))
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()

