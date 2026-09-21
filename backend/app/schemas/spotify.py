from typing import List, Optional
from pydantic import BaseModel, Field


class SpotifyTrackDTO(BaseModel):
    """
    Standard DTO representing authoritative track metadata from the Spotify Web API.
    Does not assume playback availability.
    """
    id: str = Field(..., description="Spotify track identifier")
    name: str = Field(..., description="Track title")
    artists: List[str] = Field(default_factory=list, description="Performing artist names")
    album_name: Optional[str] = Field(None, description="Associated album or single release name")
    album_id: Optional[str] = Field(None, description="Spotify album identifier")
    release_date: Optional[str] = Field(None, description="Release date in YYYY-MM-DD or YYYY format")
    duration_ms: int = Field(..., description="Track duration in milliseconds")
    isrc: Optional[str] = Field(None, description="International Standard Recording Code (deterministic ID)")
    popularity: int = Field(default=0, ge=0, le=100, description="Spotify track popularity index (0-100)")
    artwork_url: Optional[str] = Field(None, description="Highest quality cover art URL")
    explicit: bool = Field(default=False, description="Whether the track contains explicit content")
    preview_url: Optional[str] = Field(None, description="Official 30-second audio preview URL if exposed")
    spotify_url: Optional[str] = Field(None, description="Web URL to open track on Spotify")


class SpotifySearchResponseDTO(BaseModel):
    """
    Response envelope for Spotify track discovery.
    """
    query: str
    total: int
    tracks: List[SpotifyTrackDTO]
    cached: bool = False


class SpotifyStatusDTO(BaseModel):
    """
    Operational status of the Spotify secondary metadata provider.
    """
    status: str = Field(..., description="'AVAILABLE', 'DISABLED', 'RATE_LIMITED', 'ERROR'")
    configured: bool
    enabled: bool
