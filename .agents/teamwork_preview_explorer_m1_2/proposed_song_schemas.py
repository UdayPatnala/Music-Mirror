from typing import Optional, List, Any
from pydantic import BaseModel, ConfigDict, Field


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

    duration: int = 180  # Duration in seconds
    duration_str: str = "3:00"  # Formatted duration M:SS for frontend player sync
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
    tag_list: List[str] = Field(default_factory=list, description="Derived list of tag strings from comma-separated tags attribute")
    description: Optional[str] = None
    youtube_id: Optional[str] = None

    artist: Optional[ArtistDTO] = None
    album: Optional[AlbumDTO] = None

    def model_post_init(self, __context: Any) -> None:
        """Derives tag_list from tags comma-separated string if not explicitly provided."""
        if self.tags and not self.tag_list:
            self.tag_list = [t.strip() for t in self.tags.split(",") if t.strip()]


class SongCreateDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    title: str = Field(..., min_length=1, description="Title of the song")
    artist_name: str = Field(..., min_length=1, description="Name of the primary artist")
    album_title: Optional[str] = Field(None, description="Title of the album")
    duration: int = Field(180, ge=1, description="Duration in seconds")
    genre: str = Field("Pop", description="Primary genre classification")
    sub_genre: Optional[str] = Field(None, description="Sub-genre classification")
    language: str = Field("English", description="Language of the song lyrics/vocals")
    mood: str = Field("neutral", description="Primary emotional mood classification")
    tags: Optional[str] = Field(None, description="Comma-separated taxonomy tags")
    cover_image_url: Optional[str] = Field(None, description="URL of the cover art image")
    audio_url: Optional[str] = Field(None, description="Direct audio playback stream URL")
    preview_url: Optional[str] = Field(None, description="Audio preview URL")
    explicit: bool = Field(False, description="Explicit content flag")

    # Optional metadata & AI audio feature attributes
    release_date: Optional[str] = Field("2024", description="Release year or date string")
    popularity: int = Field(80, ge=0, le=100, description="Catalog popularity score (0-100)")
    energy: float = Field(0.5, ge=0.0, le=1.0, description="Normalized energy level (0.0 - 1.0)")
    danceability: float = Field(0.5, ge=0.0, le=1.0, description="Normalized danceability score (0.0 - 1.0)")
    valence: float = Field(0.5, ge=0.0, le=1.0, description="Normalized musical valence / happiness (0.0 - 1.0)")
    acousticness: float = Field(0.5, ge=0.0, le=1.0, description="Normalized acousticness ratio (0.0 - 1.0)")
    instrumentalness: float = Field(0.0, ge=0.0, le=1.0, description="Normalized instrumentalness ratio (0.0 - 1.0)")
    tempo: float = Field(120.0, ge=0.0, description="BPM tempo speed")
    description: Optional[str] = Field(None, description="Editorial description or notes")
    youtube_id: Optional[str] = Field(None, description="YouTube Video ID for fallback source resolution")


class SongUpdateDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    title: Optional[str] = Field(None, min_length=1, description="Updated song title")
    artist_name: Optional[str] = Field(None, min_length=1, description="Updated artist name")
    album_title: Optional[str] = Field(None, description="Updated album title")
    duration: Optional[int] = Field(None, ge=1, description="Updated duration in seconds")
    genre: Optional[str] = Field(None, description="Updated primary genre")
    sub_genre: Optional[str] = Field(None, description="Updated sub-genre")
    language: Optional[str] = Field(None, description="Updated language")
    mood: Optional[str] = Field(None, description="Updated mood classification")
    tags: Optional[str] = Field(None, description="Updated comma-separated tags string")
    cover_image_url: Optional[str] = Field(None, description="Updated cover image URL")
    audio_url: Optional[str] = Field(None, description="Updated audio stream URL")
    preview_url: Optional[str] = Field(None, description="Updated preview URL")
    explicit: Optional[bool] = Field(None, description="Updated explicit content flag")
    release_date: Optional[str] = Field(None, description="Updated release date")
    popularity: Optional[int] = Field(None, ge=0, le=100, description="Updated popularity score")
    description: Optional[str] = Field(None, description="Updated description")
    energy: Optional[float] = Field(None, ge=0.0, le=1.0, description="Updated energy level")
    danceability: Optional[float] = Field(None, ge=0.0, le=1.0, description="Updated danceability level")
    valence: Optional[float] = Field(None, ge=0.0, le=1.0, description="Updated valence level")
    acousticness: Optional[float] = Field(None, ge=0.0, le=1.0, description="Updated acousticness level")
    instrumentalness: Optional[float] = Field(None, ge=0.0, le=1.0, description="Updated instrumentalness level")
    tempo: Optional[float] = Field(None, ge=0.0, description="Updated BPM tempo speed")
    youtube_id: Optional[str] = Field(None, description="Updated YouTube video ID")


class PaginatedSongsResponse(BaseModel):
    items: List[SongDTO]
    total: int
    page: int
    limit: int
    total_pages: int
