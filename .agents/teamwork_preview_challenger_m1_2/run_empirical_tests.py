import sys
import os
import time
import json
from typing import List
from pydantic import ValidationError

# Add backend to path so we can import app modules
sys.path.insert(0, r"d:\PROJECT\Music Mirror\backend")

from app.db.models import Artist, Album, Song, SongSource, UserMusicPreference
from app.schemas.song import ArtistDTO, AlbumDTO, SongDTO, SongCreateDTO, SongUpdateDTO, PaginatedSongsResponse
from app.schemas.taxonomy import GenreDTO, MoodDTO, TagDTO, TaxonomySummaryDTO, SongSourceDTO

def test_orm_to_pydantic_song():
    print("=== Test 1: ORM to Pydantic Transformation (Song -> SongDTO) ===")
    artist = Artist(
        id="art-1",
        name="A. R. Rahman",
        normalized_name="a r rahman",
        image_url="http://example.com/artist.jpg",
        bio="Composer",
        genres="Film, Classical",
        country="India"
    )
    album = Album(
        id="alb-1",
        title="Dil Se",
        normalized_title="dil se",
        artist_id="art-1",
        cover_image_url="http://example.com/album.jpg",
        release_date="1998",
        total_tracks=6,
        artist=artist
    )
    song = Song(
        id="song-1",
        title="Chaiyya Chaiyya",
        normalized_title="chaiyya chaiyya",
        artist_id="art-1",
        album_id="alb-1",
        album_title="Dil Se",
        duration=394,
        release_date="1998",
        genre="Bollywood",
        sub_genre="Sufi Rock",
        language="Hindi",
        explicit=False,
        track_number=1,
        cover_image_url="http://example.com/cover.jpg",
        audio_url="http://example.com/audio.mp3",
        preview_url="http://example.com/preview.mp3",
        popularity=92,
        energy=0.9,
        danceability=0.85,
        valence=0.88,
        acousticness=0.1,
        instrumentalness=0.05,
        tempo=135.0,
        mood="energetic",
        tags="classic,90s,dance,upbeat",
        description="Iconic train song",
        youtube_id="Yw6u6Y5nQ2g",
        artist=artist,
        album=album
    )

    song_dto = SongDTO.model_validate(song)
    assert song_dto.id == "song-1"
    assert song_dto.title == "Chaiyya Chaiyya"
    assert song_dto.artist_name == "Sukhwinder Singh, Sapna Awasthi"
    assert song_dto.duration == 394
    assert song_dto.tag_list == ["classic", "90s", "dance", "upbeat"]
    assert song_dto.artist is not None and song_dto.artist.name == "A. R. Rahman"
    assert song_dto.album is not None and song_dto.album.title == "Dil Se"
    print("PASS: Song -> SongDTO mapping and model_post_init tag_list derivation verified.")

def test_orm_to_pydantic_song_source():
    print("=== Test 2: ORM to Pydantic Transformation (SongSource -> SongSourceDTO) ===")
    source = SongSource(
        id="src-1",
        song_id="song-1",
        source_type="youtube",
        source_id="Yw6u6Y5nQ2g",
        source_url="https://youtube.com/watch?v=Yw6u6Y5nQ2g",
        status="ACTIVE",
        health_score=0.95,
        reliability_score=0.98,
        channel_name="Venus Music"
    )
    source_dto = SongSourceDTO.model_validate(source)
    assert source_dto.id == "src-1"
    assert source_dto.song_id == "song-1"
    assert source_dto.source_type == "youtube"
    assert source_dto.health_score == 0.95
    assert source_dto.reliability_score == 0.98
    print("PASS: SongSource -> SongSourceDTO verified.")

def test_song_source_dto_bounds():
    print("=== Test 3: SongSourceDTO Field Bounds Stress Test ===")
    # Valid bounds
    valid = SongSourceDTO(
        id="src-2", song_id="s-2", source_type="jamendo", source_id="123", health_score=0.0, reliability_score=1.0
    )
    assert valid.health_score == 0.0

    # Invalid health_score > 1.0
    try:
        SongSourceDTO(id="src-2", song_id="s-2", source_type="jamendo", source_id="123", health_score=1.5)
        print("FAIL: Expected ValidationError for health_score > 1.0")
    except ValidationError as e:
        print("PASS: Correctly rejected health_score > 1.0")

    # Invalid reliability_score < 0.0
    try:
        SongSourceDTO(id="src-2", song_id="s-2", source_type="jamendo", source_id="123", reliability_score=-0.1)
        print("FAIL: Expected ValidationError for reliability_score < 0.0")
    except ValidationError as e:
        print("PASS: Correctly rejected reliability_score < 0.0")

def test_song_create_dto_validation():
    print("=== Test 4: SongCreateDTO Validation Stress Test ===")
    # Minimal valid
    sc = SongCreateDTO(title="Test Song", artist_name="Test Artist")
    assert sc.duration == 180
    assert sc.genre == "Pop"
    assert sc.energy == 0.5

    # Title empty string min_length constraint
    try:
        SongCreateDTO(title="", artist_name="Test Artist")
        print("FAIL: Expected ValidationError for empty title")
    except ValidationError:
        print("PASS: Empty title rejected.")

    # Artist name empty string min_length constraint
    try:
        SongCreateDTO(title="Valid", artist_name="")
        print("FAIL: Expected ValidationError for empty artist_name")
    except ValidationError:
        print("PASS: Empty artist_name rejected.")

    # Energy out of bounds (1.5 > 1.0)
    try:
        SongCreateDTO(title="Valid", artist_name="Valid", energy=1.5)
        print("FAIL: Expected ValidationError for energy > 1.0")
    except ValidationError:
        print("PASS: energy > 1.0 rejected.")

    # Popularity out of bounds (105 > 100)
    try:
        SongCreateDTO(title="Valid", artist_name="Valid", popularity=105)
        print("FAIL: Expected ValidationError for popularity > 100")
    except ValidationError:
        print("PASS: popularity > 100 rejected.")

    # Duration ge=1 constraint
    try:
        SongCreateDTO(title="Valid", artist_name="Valid", duration=0)
        print("FAIL: Expected ValidationError for duration = 0")
    except ValidationError:
        print("PASS: duration = 0 rejected.")

def test_json_serialization_deserialization():
    print("=== Test 5: JSON Serialization / Deserialization Roundtrip ===")
    dto = SongDTO(
        id="s-100",
        title="Roundtrip Song",
        normalized_title="roundtrip song",
        artist_id="art-100",
        artist_name="Roundtrip Artist",
        tags="tag1, tag2, tag3",
        energy=0.75,
        artist=ArtistDTO(id="art-100", name="Roundtrip Artist", normalized_name="roundtrip artist")
    )
    json_str = dto.model_dump_json()
    deserialized = SongDTO.model_validate_json(json_str)
    assert deserialized.id == dto.id
    assert deserialized.title == dto.title
    assert deserialized.tag_list == ["tag1", "tag2", "tag3"]
    assert deserialized.artist is not None and deserialized.artist.name == "Roundtrip Artist"
    print("PASS: JSON Roundtrip verified.")

def test_performance_stress_10k():
    print("=== Test 6: Performance Stress Test (10,000 ORM -> DTO validations) ===")
    song_orms = [
        Song(
            id=f"song-{i}",
            title=f"Stress Song {i}",
            normalized_title=f"stress song {i}",
            artist_id="art-stress",
            artist_name="Stress Artist",
            duration=200 + (i % 100),
            genre="Rock" if i % 2 == 0 else "Pop",
            mood="happy" if i % 3 == 0 else "chill",
            tags="rock, energetic, live" if i % 2 == 0 else "pop, melodic",
            energy=0.5 + (i % 50) / 100.0,
            valence=0.4 + (i % 50) / 100.0
        )
        for i in range(10000)
    ]
    t0 = time.perf_counter()
    dtos = [SongDTO.model_validate(s) for s in song_orms]
    t1 = time.perf_counter()
    elapsed = t1 - t0
    ops_per_sec = 10000 / elapsed
    print(f"PASS: 10,000 Song ORM -> SongDTO validations in {elapsed:.3f} seconds ({ops_per_sec:.1f} ops/sec)")
    assert len(dtos) == 10000

if __name__ == "__main__":
    test_orm_to_pydantic_song()
    test_orm_to_pydantic_song_source()
    test_song_source_dto_bounds()
    test_song_create_dto_validation()
    test_json_serialization_deserialization()
    test_performance_stress_10k()
    print("\nALL EMPIRICAL TESTS COMPLETED SUCCESSFULLY!")
