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

@app.post("/recommend")
def recommend(req: EmotionRequest):
    return {
        "emotion": req.emotion,
        "songs": recommend_songs(req.emotion)
    }
