"""
Edge-case validation and robustness test suite for Milestone 1 Pydantic V2 schemas.
Covers: GenreDTO, MoodDTO, TagDTO, TaxonomySummaryDTO, SongSourceDTO, SongCreateDTO, SongUpdateDTO, SongDTO.
"""

import pytest
from pydantic import ValidationError
from unittest.mock import MagicMock

from app.db.models import Song, Artist, Album, SongSource
from app.schemas import (
    GenreDTO,
    MoodDTO,
    TagDTO,
    TaxonomySummaryDTO,
    SongSourceDTO,
    SongCreateDTO,
    SongUpdateDTO,
    SongDTO,
    ArtistDTO,
    AlbumDTO,
)


# ============================================================================
# 1. GenreDTO Edge Cases
# ============================================================================
def test_genre_dto_valid():
    dto = GenreDTO(name="Rock", normalized_name="rock", song_count=10, description="Classic rock")
    assert dto.name == "Rock"
    assert dto.normalized_name == "rock"
    assert dto.song_count == 10
    assert dto.description == "Classic rock"


def test_genre_dto_missing_required():
    with pytest.raises(ValidationError) as exc_info:
        GenreDTO(normalized_name="rock")
    assert "name" in str(exc_info.value)

    with pytest.raises(ValidationError) as exc_info:
        GenreDTO(name="Rock")
    assert "normalized_name" in str(exc_info.value)


def test_genre_dto_negative_song_count():
    with pytest.raises(ValidationError) as exc_info:
        GenreDTO(name="Rock", normalized_name="rock", song_count=-1)
    assert "song_count" in str(exc_info.value)


def test_genre_dto_from_orm_mock():
    mock_orm = MagicMock()
    mock_orm.name = "Indie Pop"
    mock_orm.normalized_name = "indie pop"
    mock_orm.description = "Indie music description"
    mock_orm.song_count = 5

    dto = GenreDTO.model_validate(mock_orm)
    assert dto.name == "Indie Pop"
    assert dto.song_count == 5


# ============================================================================
# 2. MoodDTO Edge Cases
# ============================================================================
def test_mood_dto_valid():
    dto = MoodDTO(
        name="Happy",
        normalized_name="happy",
        valence_range=(0.6, 1.0),
        energy_range=(0.5, 0.9),
        description="Upbeat feel",
        song_count=12,
    )
    assert dto.name == "Happy"
    assert dto.valence_range == (0.6, 1.0)
    assert dto.energy_range == (0.5, 0.9)


def test_mood_dto_missing_required():
    with pytest.raises(ValidationError) as exc_info:
        MoodDTO(name="Happy")
    assert "normalized_name" in str(exc_info.value)


def test_mood_dto_negative_song_count():
    with pytest.raises(ValidationError) as exc_info:
        MoodDTO(name="Happy", normalized_name="happy", song_count=-5)
    assert "song_count" in str(exc_info.value)


def test_mood_dto_optional_ranges_none():
    dto = MoodDTO(name="Calm", normalized_name="calm")
    assert dto.valence_range is None
    assert dto.energy_range is None
    assert dto.song_count == 0


def test_mood_dto_from_orm_mock():
    mock_orm = MagicMock()
    mock_orm.name = "Melancholic"
    mock_orm.normalized_name = "melancholic"
    mock_orm.valence_range = (0.0, 0.4)
    mock_orm.energy_range = (0.1, 0.5)
    mock_orm.description = "Sad acoustic music"
    mock_orm.song_count = 8

    dto = MoodDTO.model_validate(mock_orm)
    assert dto.name == "Melancholic"
    assert dto.valence_range == (0.0, 0.4)


# ============================================================================
# 3. TagDTO Edge Cases
# ============================================================================
def test_tag_dto_valid():
    dto = TagDTO(name="acoustic", category="instrument", usage_count=50)
    assert dto.name == "acoustic"
    assert dto.category == "instrument"
    assert dto.usage_count == 50


def test_tag_dto_missing_required():
    with pytest.raises(ValidationError) as exc_info:
        TagDTO(category="instrument")
    assert "name" in str(exc_info.value)


def test_tag_dto_negative_usage_count():
    with pytest.raises(ValidationError) as exc_info:
        TagDTO(name="acoustic", usage_count=-1)
    assert "usage_count" in str(exc_info.value)


def test_tag_dto_empty_string_name():
    dto = TagDTO(name="", category=None, usage_count=0)
    assert dto.name == ""


# ============================================================================
# 4. TaxonomySummaryDTO Edge Cases
# ============================================================================
def test_taxonomy_summary_dto_defaults():
    dto = TaxonomySummaryDTO()
    assert dto.genres == []
    assert dto.moods == []
    assert dto.tags == []
    assert dto.total_genres == 0
    assert dto.total_moods == 0
    assert dto.total_tags == 0


def test_taxonomy_summary_dto_negative_totals():
    with pytest.raises(ValidationError) as exc_info:
        TaxonomySummaryDTO(total_genres=-1)
    assert "total_genres" in str(exc_info.value)


def test_taxonomy_summary_dto_with_nested_dtos():
    g = GenreDTO(name="Pop", normalized_name="pop", song_count=10)
    m = MoodDTO(name="Energetic", normalized_name="energetic", song_count=5)
    t = TagDTO(name="fast", usage_count=3)

    summary = TaxonomySummaryDTO(
        genres=[g],
        moods=[m],
        tags=[t],
        total_genres=1,
        total_moods=1,
        total_tags=1,
    )
    assert len(summary.genres) == 1
    assert summary.genres[0].name == "Pop"


# ============================================================================
# 5. SongSourceDTO Edge Cases
# ============================================================================
def test_song_source_dto_valid():
    dto = SongSourceDTO(
        id="src-1",
        song_id="song-1",
        source_type="youtube",
        source_id="v123",
        source_url="https://youtube.com/watch?v=v123",
        status="ACTIVE",
        health_score=0.95,
        reliability_score=0.9,
        channel_name="Vevo",
    )
    assert dto.health_score == 0.95
    assert dto.reliability_score == 0.9


def test_song_source_dto_missing_required():
    with pytest.raises(ValidationError) as exc_info:
        SongSourceDTO(id="src-1", song_id="song-1", source_type="youtube")
    assert "source_id" in str(exc_info.value)


def test_song_source_dto_health_score_out_of_bounds():
    with pytest.raises(ValidationError) as exc_info:
        SongSourceDTO(id="src-1", song_id="song-1", source_type="youtube", source_id="v123", health_score=1.5)
    assert "health_score" in str(exc_info.value)

    with pytest.raises(ValidationError) as exc_info:
        SongSourceDTO(id="src-1", song_id="song-1", source_type="youtube", source_id="v123", health_score=-0.1)
    assert "health_score" in str(exc_info.value)


def test_song_source_dto_reliability_score_out_of_bounds():
    with pytest.raises(ValidationError) as exc_info:
        SongSourceDTO(id="src-1", song_id="song-1", source_type="youtube", source_id="v123", reliability_score=2.0)
    assert "reliability_score" in str(exc_info.value)


def test_song_source_dto_from_orm():
    source_orm = SongSource(
        id="src-100",
        song_id="song-200",
        source_type="jamendo",
        source_id="track-456",
        source_url="https://jamendo.com/track/456",
        status="ACTIVE",
        health_score=1.0,
        reliability_score=1.0,
        channel_name="Jamendo Music",
    )
    dto = SongSourceDTO.model_validate(source_orm)
    assert dto.id == "src-100"
    assert dto.source_type == "jamendo"
    assert dto.health_score == 1.0


# ============================================================================
# 6. SongCreateDTO Edge Cases
# ============================================================================
def test_song_create_dto_valid_defaults():
    dto = SongCreateDTO(title="Naa Autograph", artist_name="MM Keeravani")
    assert dto.title == "Naa Autograph"
    assert dto.artist_name == "MM Keeravani"
    assert dto.duration == 180
    assert dto.genre == "Pop"
    assert dto.language == "English"
    assert dto.mood == "neutral"
    assert dto.explicit is False
    assert dto.popularity == 80
    assert dto.energy == 0.5


def test_song_create_dto_empty_title_or_artist():
    with pytest.raises(ValidationError) as exc_info:
        SongCreateDTO(title="", artist_name="Valid Artist")
    assert "title" in str(exc_info.value)

    with pytest.raises(ValidationError) as exc_info:
        SongCreateDTO(title="Valid Title", artist_name="")
    assert "artist_name" in str(exc_info.value)


def test_song_create_dto_invalid_duration():
    with pytest.raises(ValidationError) as exc_info:
        SongCreateDTO(title="Song", artist_name="Artist", duration=0)
    assert "duration" in str(exc_info.value)

    with pytest.raises(ValidationError) as exc_info:
        SongCreateDTO(title="Song", artist_name="Artist", duration=-10)
    assert "duration" in str(exc_info.value)


def test_song_create_dto_ai_feature_bounds():
    # energy > 1.0
    with pytest.raises(ValidationError) as exc_info:
        SongCreateDTO(title="Song", artist_name="Artist", energy=1.1)
    assert "energy" in str(exc_info.value)

    # danceability < 0.0
    with pytest.raises(ValidationError) as exc_info:
        SongCreateDTO(title="Song", artist_name="Artist", danceability=-0.1)
    assert "danceability" in str(exc_info.value)

    # valence > 1.0
    with pytest.raises(ValidationError) as exc_info:
        SongCreateDTO(title="Song", artist_name="Artist", valence=2.0)
    assert "valence" in str(exc_info.value)

    # popularity > 100
    with pytest.raises(ValidationError) as exc_info:
        SongCreateDTO(title="Song", artist_name="Artist", popularity=105)
    assert "popularity" in str(exc_info.value)

    # tempo < 0.0
    with pytest.raises(ValidationError) as exc_info:
        SongCreateDTO(title="Song", artist_name="Artist", tempo=-5.0)
    assert "tempo" in str(exc_info.value)


# ============================================================================
# 7. SongUpdateDTO Edge Cases
# ============================================================================
def test_song_update_dto_all_optional():
    dto = SongUpdateDTO()
    assert dto.title is None
    assert dto.artist_name is None
    assert dto.energy is None


def test_song_update_dto_empty_string_title():
    with pytest.raises(ValidationError) as exc_info:
        SongUpdateDTO(title="")
    assert "title" in str(exc_info.value)


def test_song_update_dto_invalid_bounds():
    with pytest.raises(ValidationError) as exc_info:
        SongUpdateDTO(energy=1.2)
    assert "energy" in str(exc_info.value)

    with pytest.raises(ValidationError) as exc_info:
        SongUpdateDTO(popularity=-1)
    assert "popularity" in str(exc_info.value)


# ============================================================================
# 8. SongDTO Edge Cases & ORM Compatibility
# ============================================================================
def test_song_dto_required_fields():
    with pytest.raises(ValidationError) as exc_info:
        SongDTO(title="Title Only")
    assert "id" in str(exc_info.value) or "artist_name" in str(exc_info.value)


def test_song_dto_tag_list_derivation():
    # 1. Standard comma separated
    dto1 = SongDTO(
        id="s1",
        title="Song 1",
        normalized_title="song 1",
        artist_id="a1",
        artist_name="Artist 1",
        tags="mass, energetic, telugu",
    )
    assert dto1.tag_list == ["mass", "energetic", "telugu"]

    # 2. Whitespace and empty commas
    dto2 = SongDTO(
        id="s2",
        title="Song 2",
        normalized_title="song 2",
        artist_id="a1",
        artist_name="Artist 1",
        tags="  mass , , energetic  , ",
    )
    assert dto2.tag_list == ["mass", "energetic"]

    # 3. None tags
    dto3 = SongDTO(
        id="s3",
        title="Song 3",
        normalized_title="song 3",
        artist_id="a1",
        artist_name="Artist 1",
        tags=None,
    )
    assert dto3.tag_list == []

    # 4. Empty string tags
    dto4 = SongDTO(
        id="s4",
        title="Song 4",
        normalized_title="song 4",
        artist_id="a1",
        artist_name="Artist 1",
        tags="",
    )
    assert dto4.tag_list == []

    # 5. Explicit tag_list passed
    dto5 = SongDTO(
        id="s5",
        title="Song 5",
        normalized_title="song 5",
        artist_id="a1",
        artist_name="Artist 1",
        tags="pop, rock",
        tag_list=["explicit_tag"],
    )
    assert dto5.tag_list == ["explicit_tag"]


def test_song_dto_model_validate_orm_mock():
    # Mocking a full ORM Song object
    mock_artist = MagicMock()
    mock_artist.id = "art-1"
    mock_artist.name = "AR Rahman"
    mock_artist.normalized_name = "ar rahman"
    mock_artist.image_url = None
    mock_artist.bio = None
    mock_artist.genres = "Tamil Pop"
    mock_artist.country = "India"

    mock_album = MagicMock()
    mock_album.id = "alb-1"
    mock_album.title = "Roja"
    mock_album.normalized_title = "roja"
    mock_album.artist_id = "art-1"
    mock_album.cover_image_url = None
    mock_album.release_date = "1992"
    mock_album.total_tracks = 10

    mock_song = MagicMock(spec=Song)
    mock_song.id = "song-1"
    mock_song.title = "Chinna Chinna Aasai"
    mock_song.normalized_title = "chinna chinna aasai"
    mock_song.artist_id = "art-1"
    mock_song.artist_name = "AR Rahman"  # ORM model dynamically attached or property
    mock_song.album_id = "alb-1"
    mock_song.album_title = "Roja"
    mock_song.duration = 295
    mock_song.duration_str = "4:55"
    mock_song.release_date = "1992"
    mock_song.genre = "Tamil Pop"
    mock_song.sub_genre = None
    mock_song.language = "Tamil"
    mock_song.explicit = False
    mock_song.track_number = 1
    mock_song.cover_image_url = "https://example.com/cover.jpg"
    mock_song.audio_url = "https://example.com/audio.mp3"
    mock_song.preview_url = "https://example.com/preview.mp3"
    mock_song.popularity = 95
    mock_song.energy = 0.8
    mock_song.danceability = 0.7
    mock_song.valence = 0.9
    mock_song.acousticness = 0.3
    mock_song.instrumentalness = 0.0
    mock_song.tempo = 110.0
    mock_song.mood = "happy"
    mock_song.tags = "classic, Tamil, hit"
    mock_song.description = "Iconic track"
    mock_song.youtube_id = "yt_roja_1"
    mock_song.artist = mock_artist
    mock_song.album = mock_album

    dto = SongDTO.model_validate(mock_song)
    assert dto.id == "song-1"
    assert dto.artist_name == "AR Rahman"
    assert dto.artist.name == "AR Rahman"
    assert dto.album.title == "Roja"
    assert dto.tag_list == ["classic", "Tamil", "hit"]


def test_song_dto_real_sqlalchemy_orm_instance():
    """Test model_validate against an actual SQLAlchemy Song model instance in SQLite session."""
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.db.database import Base

    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    artist = Artist(id="art-db-1", name="Sid Sriram", normalized_name="sid sriram")
    song = Song(
        id="song-db-1",
        title="Samayama",
        normalized_title="samayama",
        artist_id="art-db-1",
        genre="Telugu Pop",
        language="Telugu",
        mood="romantic",
        tags="telugu, melody",
    )

    session.add(artist)
    session.add(song)
    session.commit()

    db_song = session.query(Song).filter_by(id="song-db-1").first()

    # Note: Song model in DB has artist relationship, but not a direct artist_name column.
    # When validating db_song, if artist_name attribute is missing, set it dynamically or check behavior:
    setattr(db_song, "artist_name", db_song.artist.name if db_song.artist else "Unknown Artist")

    dto = SongDTO.model_validate(db_song)
    assert dto.id == "song-db-1"
    assert dto.title == "Samayama"
    assert dto.artist_name == "Sid Sriram"
    assert dto.tag_list == ["telugu", "melody"]
    session.close()

