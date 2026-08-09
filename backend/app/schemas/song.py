from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class ArtistDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    normalized_name: str
    image_url: Optional[str] = None
    bio: Optional[str] = None
    genres: Optional[str] = None
    country: Optional[str] = None


class AlbumDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    normalized_title: str
    artist_id: str
    cover_image_url: Optional[str] = None
    release_date: Optional[str] = None
    total_tracks: int = 1


class SongDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    normalized_title: str
    artist_id: str
    artist_name: str
    album_id: Optional[str] = None
    album_title: Optional[str] = None

    duration: int = 180 # Duration in seconds
    duration_str: str = "3:00" # Formatted duration M:SS for frontend player sync
    release_date: Optional[str] = "2024"
    genre: str = "Pop"
    sub_genre: Optional[str] = None
    language: str = "English"
    explicit: bool = False
    track_number: int = 1
    cover_image_url: Optional[str] = None
    audio_url: Optional[str] = None
    preview_url: Optional[str] = None
    popularity: int = 85

    # AI Feature Attributes
    energy: float = 0.5
    danceability: float = 0.5
    valence: float = 0.5
    acousticness: float = 0.5
    instrumentalness: float = 0.0
    tempo: float = 120.0

    mood: str = "neutral"
    tags: Optional[str] = None
    description: Optional[str] = None
    youtube_id: Optional[str] = None

    artist: Optional[ArtistDTO] = None
    album: Optional[AlbumDTO] = None


class PaginatedSongsResponse(BaseModel):
    items: List[SongDTO]
    total: int
    page: int
    limit: int
    total_pages: int
