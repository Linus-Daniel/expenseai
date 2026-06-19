from pydantic_settings import BaseSettings
from pydantic import model_validator
from functools import lru_cache
import os


class Settings(BaseSettings):
    PROJECT_NAME: str = "ExpenseAI"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api/v1"

    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/expenseai"
    DATABASE_URL_SYNC: str = "postgresql+psycopg2://postgres:postgres@localhost:5432/expenseai"

    SECRET_KEY: str = "dev-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Resolve ml/models relative to the project root (one level up from backend/)
    MODEL_DIR: str = os.path.join(os.path.dirname(os.path.dirname(__file__)), "ml", "models")

    REDIS_URL: str = "redis://localhost:6379/0"

    class Config:
        env_file = ".env"
        case_sensitive = True

    @model_validator(mode="after")
    def adjust_database_urls(self) -> "Settings":
        url = self.DATABASE_URL
        if url:
            if url.startswith("postgres://"):
                url = url.replace("postgres://", "postgresql+asyncpg://", 1)
            elif url.startswith("postgresql://"):
                url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
            self.DATABASE_URL = url

        if "DATABASE_URL_SYNC" not in os.environ:
            if url:
                if url.startswith("postgresql+asyncpg://"):
                    self.DATABASE_URL_SYNC = url.replace("postgresql+asyncpg://", "postgresql+psycopg2://", 1)
                elif url.startswith("sqlite+aiosqlite://"):
                    self.DATABASE_URL_SYNC = url.replace("sqlite+aiosqlite://", "sqlite://", 1)
        else:
            sync_url = self.DATABASE_URL_SYNC
            if sync_url:
                if sync_url.startswith("postgres://"):
                    sync_url = sync_url.replace("postgres://", "postgresql+psycopg2://", 1)
                elif sync_url.startswith("postgresql://"):
                    sync_url = sync_url.replace("postgresql://", "postgresql+psycopg2://", 1)
                self.DATABASE_URL_SYNC = sync_url

        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()

