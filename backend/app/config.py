from pydantic_settings import BaseSettings
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


@lru_cache
def get_settings() -> Settings:
    return Settings()
