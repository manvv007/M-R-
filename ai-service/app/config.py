from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    APP_NAME: str = "RoadWatch AI Service"
    APP_VERSION: str = "1.0.0"

    AI_SERVICE_HOST: str = "0.0.0.0"
    AI_SERVICE_PORT: int = 8081

    USE_MOCK_AI: bool = True
    YOLO_MODEL_PATH: str = "./models/yolov8n.pt"
    OCR_ENGINE: str = "easyocr"

    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173", "http://localhost:5180", "http://localhost:8080", "http://localhost:8000"]

    class Config:
        env_file = "../.env"
        case_sensitive = True
        extra = "allow"


settings = Settings()
