"""
Music Mirror API Schemas Package.
Consolidates and re-exports all Pydantic DTOs for taxonomy, songs, user preferences, and emotion recommendations.
"""

from app.schemas.taxonomy import (
    GenreDTO,
    MoodDTO,
    TagDTO,
    TaxonomySummaryDTO,
    SongSourceDTO,
)
from app.schemas.song import (
    ArtistDTO,
    AlbumDTO,
    SongDTO,
    SongCreateDTO,
    SongUpdateDTO,
    PaginatedSongsResponse,
)
from app.schemas.user_preference import (
    UserMusicPreferenceDTO,
    UpdateUserMusicPreferencePayload,
)
from app.schemas.emotion import (
    EmotionRequest,
    SongResponse,
    RecommendationResponse,
    TransitionRequest,
    TransitionResponse,
)

from app.schemas.songs import (
    ScoreBreakdownDTO,
    YouTubeCandidateDTO,
    YouTubeSearchResponseDTO,
    YouTubeSearchResultDTO,
)

__all__ = [
    # Taxonomy & Source DTOs
    "GenreDTO",
    "MoodDTO",
    "TagDTO",
    "TaxonomySummaryDTO",
    "SongSourceDTO",
    # Song & Catalog DTOs
    "ArtistDTO",
    "AlbumDTO",
    "SongDTO",
    "SongCreateDTO",
    "SongUpdateDTO",
    "PaginatedSongsResponse",
    # User Preference DTOs
    "UserMusicPreferenceDTO",
    "UpdateUserMusicPreferencePayload",
    # Emotion & Recommendation DTOs
    "EmotionRequest",
    "SongResponse",
    "RecommendationResponse",
    "TransitionRequest",
    "TransitionResponse",
]


