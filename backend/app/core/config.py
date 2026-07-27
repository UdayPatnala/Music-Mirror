import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Music Mirror API"
    ALLOWED_ORIGINS: list[str] = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000,https://emotion-music-recommender-wruw.onrender.com,https://music-mirror-aos.vercel.app"
    ).split(",")

settings = Settings()
