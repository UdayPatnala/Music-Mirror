from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from recommender import recommend_songs

app = FastAPI(title="Emotion Music API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class EmotionRequest(BaseModel):
    emotion: str


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
