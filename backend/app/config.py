from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    APP_NAME: str = "RoadWatch API"
    APP_VERSION: str = "1.0.0"

    POSTGRES_USER: str = "roadwatch_admin"
    POSTGRES_PASSWORD: str = "roadwatch_secure_pass_2026"
    POSTGRES_DB: str = "roadwatch_db"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432

    SECRET_KEY: str = "your-secret-key-change-this-in-production-change-me-abc123xyz789"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    AI_SERVICE_URL: str = "http://localhost:8001"
    USE_MOCK_AI: bool = True
    DEMO_MODE: bool = True

    MAX_UPLOAD_SIZE_MB: int = 50
    ALLOWED_IMAGE_TYPES: List[str] = ["jpg", "jpeg", "png"]
    ALLOWED_VIDEO_TYPES: List[str] = ["mp4", "mov"]
    UPLOAD_DIR: str = "./uploads"

    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]

    @property
    def DATABASE_URL(self) -> str:
        return "sqlite:///./roadwatch.db"

    class Config:
        env_file = "../.env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "allow"


settings = Settings()
