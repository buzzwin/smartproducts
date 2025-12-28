"""Database configuration and settings."""
from enum import Enum
from typing import Optional
from pathlib import Path
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class DatabaseType(str, Enum):
    """Supported database types."""
    SQLITE = "sqlite"
    MONGODB = "mongodb"
    POSTGRESQL = "postgresql"
    MYSQL = "mysql"


class DatabaseConfig(BaseSettings):
    """Database configuration settings.
    
    Environment variables are loaded from:
    1. .env.local (highest priority, overrides .env)
    2. .env (fallback)
    
    Variables should be prefixed with DATABASE_ (e.g., DATABASE_TYPE, DATABASE_URL)
    
    Note: database_url must be provided via DATABASE_URL environment variable.
    No default value - must be configured in .env.local or .env file.
    """
    database_type: DatabaseType = Field(default=DatabaseType.MONGODB, validation_alias="DATABASE_TYPE")
    database_url: str = Field(..., validation_alias="DATABASE_URL")  # Required - reads from DATABASE_URL env var directly
    
    model_config = SettingsConfigDict(
        # Load .env.local (highest priority), then .env (fallback)
        # Paths are relative to where the application runs (backend/ directory)
        # Note: pydantic-settings processes files in order, later files override earlier ones
        env_file=[
            ".env",        # Load first (lower priority)
            ".env.local",  # Load last (higher priority, overrides .env)
        ],
        # No env_prefix - we use explicit field names/aliases
        # DATABASE_URL is read via validation_alias, DATABASE_TYPE via field name
        case_sensitive=False,
        env_file_encoding="utf-8",
        env_ignore_empty=True,
        populate_by_name=True,  # Allow both alias and field name
        extra="ignore",
    )

    @property
    def is_sql(self) -> bool:
        """Check if the database type is SQL-based."""
        return self.database_type in [DatabaseType.SQLITE, DatabaseType.POSTGRESQL, DatabaseType.MYSQL]
    
    @property
    def is_nosql(self) -> bool:
        """Check if the database type is NoSQL (MongoDB)."""
        return self.database_type == DatabaseType.MONGODB


# Global configuration instance
# Manually load .env.local file FIRST to ensure it's loaded before pydantic-settings reads env_file
_config_dir = Path(__file__).parent.parent
_env_local_path = _config_dir / ".env.local"
_env_path = _config_dir / ".env"

# Load .env files manually using python-dotenv (this sets os.environ)
# Environment variables have higher priority than env_file in pydantic-settings
from dotenv import load_dotenv
import os

if _env_path.exists():
    load_dotenv(_env_path, override=False)  # Load .env first (lower priority)
if _env_local_path.exists():
    load_dotenv(_env_local_path, override=True)  # Load .env.local last (higher priority, overrides .env)
    # Debug: Verify environment variable was set
    db_url_from_env = os.getenv("DATABASE_URL", "NOT SET")
    if db_url_from_env != "NOT SET":
        print(f"📝 Loaded DATABASE_URL from .env.local: {db_url_from_env[:50]}...")
    else:
        print(f"❌ Failed to load DATABASE_URL from .env.local")

# Now create config - it will read from os.environ (which we just set) and from env_file
try:
    db_config = DatabaseConfig()
except Exception as e:
    # If DATABASE_URL is not set, provide a helpful error message
    db_url_from_env = os.getenv("DATABASE_URL")
    if not db_url_from_env:
        raise ValueError(
            f"❌ DATABASE_URL environment variable is required but not set!\n"
            f"   Please set DATABASE_URL in .env.local or .env file.\n"
            f"   Expected location: {_env_local_path}\n"
            f"   Example: DATABASE_URL=mongodb+srv://user:pass@cluster.mongodb.net/dbname"
        ) from e
    raise

# Debug: Print loaded configuration (without sensitive data)
if db_config.database_url.startswith("mongodb+srv://"):
    print(f"✅ Database config loaded: Type={db_config.database_type}, URL=mongodb+srv://...@{db_config.database_url.split('@')[-1] if '@' in db_config.database_url else 'unknown'}")
elif db_config.database_url.startswith("mongodb://"):
    print(f"✅ Database config loaded: Type={db_config.database_type}, URL={db_config.database_url}")
else:
    print(f"⚠️  Database config loaded: Type={db_config.database_type}, URL={db_config.database_url[:80]}...")

