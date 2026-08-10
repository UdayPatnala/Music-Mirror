from typing import List, Optional, Tuple
from pydantic import BaseModel, ConfigDict, Field


class GenreDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str = Field(..., description="Genre display name, e.g., 'Telugu Pop'")
    normalized_name: str = Field(..., description="Normalized lookup string, e.g., 'telugu pop'")
    description: Optional[str] = Field(None, description="Detailed genre description")
    song_count: int = Field(0, ge=0, description="Total songs cataloged under this genre")


class MoodDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str = Field(..., description="Mood display name, e.g., 'Energetic'")
    normalized_name: str = Field(..., description="Normalized lookup string, e.g., 'energetic'")
    valence_range: Optional[Tuple[float, float]] = Field(
        None, description="Valence lower/upper bounds [min, max] between 0.0 and 1.0"
    )
    energy_range: Optional[Tuple[float, float]] = Field(
        None, description="Energy lower/upper bounds [min, max] between 0.0 and 1.0"
    )
    description: Optional[str] = Field(None, description="Detailed mood description")
    song_count: int = Field(0, ge=0, description="Total songs tagged with this mood")


class TagDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str = Field(..., description="Tag name, e.g., 'danceable'")
    category: Optional[str] = Field(None, description="Optional tag category, e.g., 'tempo' or 'style'")
    usage_count: int = Field(0, ge=0, description="Total occurrences across songs")


class TaxonomySummaryDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    genres: List[GenreDTO] = Field(default_factory=list, description="List of genre taxonomy items")
    moods: List[MoodDTO] = Field(default_factory=list, description="List of mood taxonomy items")
    tags: List[TagDTO] = Field(default_factory=list, description="List of tag taxonomy items")
    total_genres: int = Field(0, ge=0, description="Count of distinct genres")
    total_moods: int = Field(0, ge=0, description="Count of distinct moods")
    total_tags: int = Field(0, ge=0, description="Count of distinct tags")


class SongSourceDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str = Field(..., description="Unique UUID of the song source record")
    song_id: str = Field(..., description="Foreign key reference to Song ID")
    source_type: str = Field(..., description="Source platform type ('youtube', 'jamendo', 'spotify', 'soundcloud')")
    source_id: str = Field(..., description="External ID on the source platform")
    source_url: Optional[str] = Field(None, description="Playable audio URL or stream endpoint")
    status: str = Field("ACTIVE", description="Source availability status ('ACTIVE', 'DEGRADED', 'UNAVAILABLE', etc.)")
    health_score: float = Field(1.0, ge=0.0, le=1.0, description="Calculated health score between 0.0 and 1.0")
    reliability_score: float = Field(1.0, ge=0.0, le=1.0, description="Reliability score between 0.0 and 1.0")
    channel_name: Optional[str] = Field(None, description="Source provider or channel name")
