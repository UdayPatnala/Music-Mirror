import os
from dataclasses import dataclass, field

@dataclass
class Settings:
    PROJECT_NAME: str = "Music Mirror API"
    ALLOWED_ORIGINS: list[str] = field(default_factory=lambda: os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173,http://localhost:8000,http://127.0.0.1:8000,https://emotion-music-recommender-wruw.onrender.com,https://music-mirror-aos.vercel.app"
    ).split(","))

    SPOTIFY_CLIENT_ID: str = field(default_factory=lambda: os.getenv("SPOTIFY_CLIENT_ID", ""))
    SPOTIFY_CLIENT_SECRET: str = field(default_factory=lambda: os.getenv("SPOTIFY_CLIENT_SECRET", ""))

    @property
    def SPOTIFY_ENABLED(self) -> bool:
        return bool(self.SPOTIFY_CLIENT_ID and self.SPOTIFY_CLIENT_SECRET)

settings = Settings()
