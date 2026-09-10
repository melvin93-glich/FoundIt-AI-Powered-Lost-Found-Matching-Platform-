import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    MONGODB_URL: str = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    DB_NAME: str = os.getenv("DB_NAME", "foundit")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "super_secret_foundit_jwt_key_change_in_prod_2026")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    
    CLOUDINARY_CLOUD_NAME: str = os.getenv("CLOUDINARY_CLOUD_NAME", "")
    CLOUDINARY_API_KEY: str = os.getenv("CLOUDINARY_API_KEY", "")
    CLOUDINARY_API_SECRET: str = os.getenv("CLOUDINARY_API_SECRET", "")

    VECTOR_SEARCH_BACKEND: str = os.getenv("VECTOR_SEARCH_BACKEND", "local")
    EMBEDDING_MODEL_VERSION: str = "clip-vit-b32-v1"

    class Config:
        env_file = ".env"

settings = Settings()
