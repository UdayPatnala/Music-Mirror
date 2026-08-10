import pytest
from app.db.models import SongSource, Artist, Album, Song
from app.schemas import (
    GenreDTO,
    MoodDTO,
    TagDTO,
    TaxonomySummaryDTO,
    SongSourceDTO,
    ArtistDTO,
    AlbumDTO,
    SongDTO,
    SongCreateDTO,
    SongUpdateDTO,
    PaginatedSongsResponse,
    UserMusicPreferenceDTO,
    UpdateUserMusicPreferencePayload,
    EmotionRequest,
    SongResponse,
    RecommendationResponse,
    TransitionRequest,
    TransitionResponse,
)
import app.schemas as schemas_pkg


def test_schema_package_exports():
    """Verify that all 18 DTOs are present in app.schemas.__all__."""
    expected_dtos = [
        "GenreDTO",
        "MoodDTO",
        "TagDTO",
        "TaxonomySummaryDTO",
        "SongSourceDTO",
        "ArtistDTO",
        "AlbumDTO",
        "SongDTO",
        "SongCreateDTO",
        "SongUpdateDTO",
        "PaginatedSongsResponse",
        "UserMusicPreferenceDTO",
        "UpdateUserMusicPreferencePayload",
        "EmotionRequest",
        "SongResponse",
        "RecommendationResponse",
        "TransitionRequest",
        "TransitionResponse",
    ]
    assert len(schemas_pkg.__all__) == 18
    for dto_name in expected_dtos:
        assert dto_name in schemas_pkg.__all__
        assert hasattr(schemas_pkg, dto_name)


def test_taxonomy_dtos():
    """Verify taxonomy and source DTO instantiation and ORM validation."""
    # GenreDTO
    genre = GenreDTO(name="Telugu Pop", normalized_name="telugu pop", song_count=25)
    assert genre.name == "Telugu Pop"
    assert genre.song_count == 25

    # MoodDTO
    mood = MoodDTO(
        name="Energetic",
        normalized_name="energetic",
        valence_range=(0.5, 1.0),
        energy_range=(0.7, 1.0),
        song_count=15,
    )
    assert mood.valence_range == (0.5, 1.0)
    assert mood.energy_range == (0.7, 1.0)

    # TagDTO
    tag = TagDTO(name="danceable", category="style", usage_count=42)
    assert tag.name == "danceable"
    assert tag.usage_count == 42

    # TaxonomySummaryDTO
    summary = TaxonomySummaryDTO(
        genres=[genre],
        moods=[mood],
        tags=[tag],
        total_genres=1,
        total_moods=1,
        total_tags=1,
    )
    assert summary.total_genres == 1
    assert len(summary.genres) == 1

    # SongSourceDTO from attributes
    source_orm = SongSource(
        id="src-100",
        song_id="song-200",
        source_type="youtube",
        source_id="yt_abc123",
        source_url="https://youtube.com/watch?v=yt_abc123",
        status="ACTIVE",
        health_score=0.98,
        reliability_score=0.99,
        channel_name="Official Music Channel",
    )
    source_dto = SongSourceDTO.model_validate(source_orm)
    assert source_dto.id == "src-100"
    assert source_dto.source_type == "youtube"
    assert source_dto.health_score == 0.98


def test_song_create_and_update_dtos():
    """Verify SongCreateDTO and SongUpdateDTO validation behavior."""
    create_dto = SongCreateDTO(
        title="Kurchi Madathapetti",
        artist_name="Thaman S",
        album_title="Guntur Kaaram",
        duration=217,
        genre="Telugu Pop",
        tags="mass, dance, beat",
        energy=0.9,
    )
    assert create_dto.title == "Kurchi Madathapetti"
    assert create_dto.artist_name == "Thaman S"
    assert create_dto.duration == 217
    assert create_dto.energy == 0.9

    update_dto = SongUpdateDTO(
        title="Kurchi Madathapetti (Remix)",
        tempo=135.0,
    )
    assert update_dto.title == "Kurchi Madathapetti (Remix)"
    assert update_dto.tempo == 135.0
    assert update_dto.artist_name is None


def test_song_dto_tag_list_derivation():
    """Verify SongDTO auto-derivation of tag_list from tags string."""
    song_dto = SongDTO(
        id="s1",
        title="Samayama",
        normalized_title="samayama",
        artist_id="a1",
        artist_name="Sid Sriram",
        tags="romantic, telugu, melody",
    )
    assert song_dto.tag_list == ["romantic", "telugu", "melody"]

    # When tag_list is explicitly supplied, it should not be overwritten
    song_dto_explicit = SongDTO(
        id="s2",
        title="Heat Waves",
        normalized_title="heat waves",
        artist_id="a2",
        artist_name="Glass Animals",
        tags="indie, pop",
        tag_list=["custom_tag"],
    )
    assert song_dto_explicit.tag_list == ["custom_tag"]


def test_song_dto_direct_orm_validation():
    """Verify direct SongDTO.model_validate(song_orm) works seamlessly with and without attached Artist relationship."""
    artist_orm = Artist(id="a100", name="Sid Sriram", normalized_name="sid sriram")
    song_orm = Song(
        id="s100",
        title="Samayama",
        normalized_title="samayama",
        artist_id="a100",
        duration=210,
        genre="Telugu Pop",
        tags="romantic, melody",
    )
    song_orm.artist = artist_orm

    dto = SongDTO.model_validate(song_orm)
    assert dto.id == "s100"
    assert dto.title == "Samayama"
    assert dto.artist_name == "Sid Sriram"
    assert dto.duration == 210
    assert dto.duration_str == "3:30"
    assert dto.tag_list == ["romantic", "melody"]

    # Test without attached artist relationship
    song_no_artist = Song(
        id="s101",
        title="Solo Song",
        normalized_title="solo song",
        artist_id="a101",
        duration=185,
    )
    dto_no_artist = SongDTO.model_validate(song_no_artist)
    assert dto_no_artist.id == "s101"
    assert dto_no_artist.artist_name == "Unknown Artist"
    assert dto_no_artist.duration_str == "3:05"

