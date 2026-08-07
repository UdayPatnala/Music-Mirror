from pydantic import BaseModel, Field
from typing import Any

class EmotionRequest(BaseModel):
    emotion: str = Field(..., max_length=50, description="The detected facial emotion")
    genre: str | None = Field("Pop", max_length=50, description="User preferred genre")
    goal: str | None = Field("Match my mood", max_length=100, description="User cognitive goal")
    languages: list[str] | None = Field(default=["Telugu", "English", "Tamil", "Hindi"], description="User preferred languages")

class SongResponse(BaseModel):
    title: str | None = None
    name: str | None = None
    artist: str
    genre: str | None = None
    language: str | None = Field("English", description="Song language")
    source_provider: str | None = Field("YouTube", description="Primary audio source provider")
    album_art: str | None = None
    preview_url: str | None = None
    spotify_url: str | None = None
    youtubeId: str | None = None
    recommendation_score: float | None = None
    audio_features: dict[str, Any] | None = None
    recommendation_reason: str | None = None

    def model_post_init(self, __context: Any) -> None:
        if not self.name and self.title:
            self.name = self.title
        elif not self.title and self.name:
            self.title = self.name

class RecommendationResponse(BaseModel):
    emotion: str
    normalized_emotion: str
    songs: list[SongResponse]

class TransitionRequest(BaseModel):
    start_emotion: str = Field(..., description="Current detected emotion")
    target_emotion: str = Field(..., description="Desired target emotion")
    steps: int = Field(4, ge=2, le=10, description="Number of transition steps")
    genre: str | None = Field(None, description="Preferred genre")

class TransitionResponse(BaseModel):
    start_emotion: str
    target_emotion: str
    steps: int
    journey: list[SongResponse]


