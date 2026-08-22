from typing import Optional, List, Any
from pydantic import BaseModel, ConfigDict, Field, model_validator

# Re-export base song schemas from song.py or define canonical definitions
from app.schemas.song import (
    ArtistDTO,
    AlbumDTO,
    SongDTO,
    SongCreateDTO,
    SongUpdateDTO,
    PaginatedSongsResponse,
)


class ScoreBreakdownDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    similarity: float = Field(0.0, description="String similarity and token overlap score (0.0 - 1.0)")
    authority: float = Field(0.0, description="Channel authority and official status score (0.0 - 1.0)")
    duration: float = Field(0.0, description="Duration proximity score (0.0 - 1.0)")
    recency: float = Field(0.0, description="Release recency and freshness score (0.0 - 1.0)")
    popularity: float = Field(0.0, description="View count popularity score (0.0 - 1.0)")
    penalties: float = Field(0.0, description="Deductions for live/reaction/loop tokens (0.0 - 1.0)")


class YouTubeCandidateDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    video_id: str = Field(..., description="11-character YouTube video ID")
    title: str = Field(..., description="Raw or formatted title of the YouTube video")
    channel_name: str = Field(..., description="Name of the uploader or channel")
    channel_is_verified: bool = Field(False, description="Whether channel has verified or label status")
    channel_is_topic: bool = Field(False, description="Whether channel is an automated YouTube Topic channel")
    channel_is_vevo: bool = Field(False, description="Whether channel is an official VEVO partner channel")
    duration_seconds: int = Field(180, description="Duration in seconds")
    duration_str: str = Field("3:00", description="Formatted duration M:SS")
    published_at: Optional[str] = Field(None, description="Publication date or timestamp string")
    view_count: Optional[int] = Field(0, description="Total view count")
    thumbnail_url: str = Field("", description="High quality thumbnail URL")
    watch_url: str = Field("", description="Direct YouTube watch URL")
    score: float = Field(0.0, description="Composite weighted relevance score (0.0 - 1.0)")
    relevance_score: Optional[float] = Field(None, description="Alias for score for backward compatibility")
    score_breakdown: Optional[ScoreBreakdownDTO] = Field(None, description="Detailed sub-score breakdown")

    @model_validator(mode="before")
    @classmethod
    def populate_aliases(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "score" in data and "relevance_score" not in data:
                data["relevance_score"] = data["score"]
            elif "relevance_score" in data and "score" not in data:
                data["score"] = data["relevance_score"]
            if "duration_seconds" in data and ("duration_str" not in data or not data.get("duration_str")):
                sec = data["duration_seconds"] or 0
                data["duration_str"] = f"{sec // 60}:{sec % 60:02d}"
            if "video_id" in data and ("watch_url" not in data or not data.get("watch_url")):
                data["watch_url"] = f"https://www.youtube.com/watch?v={data['video_id']}"
        return data


class YouTubeSearchResponseDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    query: str = Field(..., description="Original search query string")
    normalized_query: str = Field(..., description="Sanitized and normalized query string")
    cached: bool = Field(False, description="Indicates whether the response was served from L1 Query Cache")
    candidates: List[YouTubeCandidateDTO] = Field(default_factory=list, description="Ranked candidate pool")
    total_candidates: Optional[int] = Field(None, description="Count of returned candidates")

    @model_validator(mode="before")
    @classmethod
    def populate_total(cls, data: Any) -> Any:
        if isinstance(data, dict):
            candidates = data.get("candidates", [])
            if data.get("total_candidates") is None:
                data["total_candidates"] = len(candidates)
        return data


class YouTubeSearchResultDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    video_id: str
    title: str
    channel_name: str
    duration: int
    duration_str: str
    thumbnail_url: str
    watch_url: str
    relevance_score: float


__all__ = [
    "ArtistDTO",
    "AlbumDTO",
    "SongDTO",
    "SongCreateDTO",
    "SongUpdateDTO",
    "PaginatedSongsResponse",
    "ScoreBreakdownDTO",
    "YouTubeCandidateDTO",
    "YouTubeSearchResponseDTO",
    "YouTubeSearchResultDTO",
]
