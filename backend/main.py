import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from recommender import recommend_songs

app = FastAPI(title="Emotion Music API")

# Security Enhancement: Restrict CORS to known frontend origins instead of "*"
ALLOWED_ORIGINS = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,http://[::1]:3000,https://emotion-music-recommender-wruw.onrender.com"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    # Security Enhancement: Restrict allowed methods
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


class EmotionRequest(BaseModel):
    # Security Enhancement: Add input length limits to prevent DoS
    emotion: str = Field(..., max_length=50)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/recommend")
def recommend(req: EmotionRequest):
    normalized_emotion, songs = recommend_songs(req.emotion)
    return {
        "emotion": req.emotion,
        "normalized_emotion": normalized_emotion,
        "songs": songs,
    }
