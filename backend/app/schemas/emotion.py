from pydantic import BaseModel, Field

class EmotionRequest(BaseModel):
    emotion: str = Field(..., max_length=50, description="The detected facial emotion")
    genre: str | None = Field("Pop", max_length=50, description="User preferred genre")
    goal: str | None = Field("Match my mood", max_length=100, description="User cognitive goal")

class SongResponse(BaseModel):
    name: str
    artist: str
    album_art: str | None = None
    preview_url: str | None = None
    spotify_url: str | None = None
    recommendation_score: float | None = None

class RecommendationResponse(BaseModel):
    emotion: str
    normalized_emotion: str
    songs: list[SongResponse]
