import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.db.database import Base, get_db
from app.db.models import Song, Artist, Album, SongSource
from app.ingestion.ingestion_service import IngestionService
from app.main import app

TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, expire_on_commit=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def seed_test_catalog(db_session):
    """Populates the database with test songs covering various genres, moods, tags, and audio features."""
    songs_data = [
        {
            "title": "Blinding Lights",
            "artist_name": "The Weeknd",
            "album_title": "After Hours",
            "genre": "Synthpop",
            "sub_genre": "Retrowave",
            "language": "English",
            "mood": "energetic",
            "tags": "dance, synth, 80s, upbeat",
            "energy": 0.8,
            "valence": 0.75,
            "danceability": 0.6,
            "acousticness": 0.1,
            "instrumentalness": 0.0,
            "explicit": False,
            "youtube_id": "4NRXx6U8ABQ",
            "popularity": 95,
        },
        {
            "title": "Save Your Tears",
            "artist_name": "The Weeknd",
            "album_title": "After Hours",
            "genre": "Pop",
            "sub_genre": "Dance-Pop",
            "language": "English",
            "mood": "melancholic",
            "tags": "sad, dance, pop",
            "energy": 0.55,
            "valence": 0.4,
            "danceability": 0.7,
            "acousticness": 0.2,
            "instrumentalness": 0.0,
            "explicit": False,
            "youtube_id": "XXYlFuWEuKI",
            "popularity": 90,
        },
        {
            "title": "Kesariya",
            "artist_name": "Arijit Singh",
            "album_title": "Brahmastra",
            "genre": "Bollywood",
            "sub_genre": "Romantic",
            "language": "Hindi",
            "mood": "romantic",
            "tags": "love, acoustic, hindi",
            "energy": 0.65,
            "valence": 0.7,
            "danceability": 0.5,
            "acousticness": 0.4,
            "instrumentalness": 0.0,
            "explicit": False,
            "youtube_id": "BddP6PYo2gs",
            "popularity": 88,
        },
        {
            "title": "Explicit Track",
            "artist_name": "Rapper X",
            "album_title": "Uncensored",
            "genre": "Hip-Hop",
            "sub_genre": "Trap",
            "language": "English",
            "mood": "aggressive",
            "tags": "rap, explicit, heavy",
            "energy": 0.9,
            "valence": 0.3,
            "danceability": 0.8,
            "acousticness": 0.05,
            "instrumentalness": 0.0,
            "explicit": True,
            "youtube_id": "explicit_123",
            "popularity": 75,
        },
    ]

    for s_data in songs_data:
        IngestionService.ingest_song_record(db_session, s_data, source_type="curated_seed")


# ── TEST 1: SINGLE FILTERS ───────────────────────────────────────────────────
def test_get_songs_single_filters(client, db_session):
    seed_test_catalog(db_session)

    # Genre filter (case-insensitive)
    resp = client.get("/api/v2/songs?genre=synthpop")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["title"] == "Blinding Lights"

    # Mood filter (case-insensitive)
    resp = client.get("/api/v2/songs?mood=ROMANTIC")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["title"] == "Kesariya"

    # Sub-genre filter
    resp = client.get("/api/v2/songs?sub_genre=retrowave")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["sub_genre"] == "Retrowave"

    # Explicit content filter
    resp = client.get("/api/v2/songs?explicit=true")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["title"] == "Explicit Track"


# ── TEST 2: COMBINED FILTERS ────────────────────────────────────────────────
def test_get_songs_combined_filters(client, db_session):
    seed_test_catalog(db_session)

    # Genre + Mood match
    resp = client.get("/api/v2/songs?genre=Pop&mood=melancholic")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["title"] == "Save Your Tears"

    # Genre + Mood no match
    resp = client.get("/api/v2/songs?genre=Pop&mood=romantic")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 0
    assert data["items"] == []


# ── TEST 3: TAG FILTERING ───────────────────────────────────────────────────
def test_get_songs_tag_filtering(client, db_session):
    seed_test_catalog(db_session)

    # Filter by tag "synth"
    resp = client.get("/api/v2/songs?tag=synth")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["title"] == "Blinding Lights"

    # Substring tag match "dance" -> matches Blinding Lights and Save Your Tears
    resp = client.get("/api/v2/songs?tag=dance")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 2


# ── TEST 4: AUDIO FEATURE RANGE FILTERING ──────────────────────────────────
def test_get_songs_audio_feature_ranges(client, db_session):
    seed_test_catalog(db_session)

    # Energy min range filter (energy >= 0.75)
    resp = client.get("/api/v2/songs?energy_min=0.75")
    assert resp.status_code == 200
    data = resp.json()
    titles = [item["title"] for item in data["items"]]
    assert "Blinding Lights" in titles
    assert "Explicit Track" in titles
    assert "Save Your Tears" not in titles

    # Valence range filter (0.35 <= valence <= 0.5)
    resp = client.get("/api/v2/songs?valence_min=0.35&valence_max=0.5")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["title"] == "Save Your Tears"


# ── TEST 5: NON-MATCHING QUERY (NON-500 HANDLING) ─────────────────────────
def test_get_songs_non_matching_query(client, db_session):
    seed_test_catalog(db_session)

    resp = client.get("/api/v2/songs?genre=NonExistentGenre123")
    assert resp.status_code == 200
    data = resp.json()
    assert data["items"] == []
    assert data["total"] == 0
    assert data["page"] == 1
    assert data["limit"] == 20
    assert data["total_pages"] == 1


# ── TEST 6: POST /api/v2/songs INGESTION ────────────────────────────────────
def test_post_songs_ingestion(client, db_session):
    payload = {
        "title": "Levitating",
        "artist_name": "Dua Lipa",
        "album_title": "Future Nostalgia",
        "genre": "Pop",
        "sub_genre": "Nu-Disco",
        "language": "English",
        "mood": "energetic",
        "tags": "dance, disco, party",
        "duration": 203,
        "explicit": False,
        "energy": 0.88,
        "danceability": 0.72,
        "valence": 0.91,
        "acousticness": 0.01,
        "instrumentalness": 0.0,
        "popularity": 92,
    }

    resp = client.post("/api/v2/songs", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Levitating"
    assert data["artist_name"] == "Dua Lipa"
    assert data["album_title"] == "Future Nostalgia"
    assert data["sub_genre"] == "Nu-Disco"
    assert data["explicit"] is False
    assert data["tags"] == "dance, disco, party"

    # Verify song is in catalog
    get_resp = client.get("/api/v2/songs?search=Levitating")
    assert get_resp.status_code == 200
    assert get_resp.json()["total"] == 1

    # Missing required title -> returns 422 (FastAPI validation) or 400
    bad_payload = {"artist_name": "Artist Without Title"}
    bad_resp = client.post("/api/v2/songs", json=bad_payload)
    assert bad_resp.status_code in [400, 422]


# ── TEST 7: TAXONOMY ENDPOINTS ──────────────────────────────────────────────
def test_taxonomy_endpoints(client, db_session):
    seed_test_catalog(db_session)

    # /meta/taxonomy
    resp = client.get("/api/v2/songs/meta/taxonomy")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_genres"] >= 4
    assert data["total_moods"] >= 4
    assert data["total_tags"] >= 5

    # /meta/genres
    genres_resp = client.get("/api/v2/songs/meta/genres")
    assert genres_resp.status_code == 200
    genres = genres_resp.json()
    assert isinstance(genres, list)
    assert "Synthpop" in genres
    assert "Pop" in genres

    # /meta/moods
    moods_resp = client.get("/api/v2/songs/meta/moods")
    assert moods_resp.status_code == 200
    moods = moods_resp.json()
    assert "energetic" in moods
    assert "romantic" in moods

    # /meta/tags
    tags_resp = client.get("/api/v2/songs/meta/tags")
    assert tags_resp.status_code == 200
    tags = tags_resp.json()
    assert "dance" in tags
    assert "synth" in tags


# ── TEST 8: GET /{song_id}/source ───────────────────────────────────────────
def test_get_song_source(client, db_session):
    seed_test_catalog(db_session)

    # Get a song with youtube_id
    song = db_session.query(Song).filter(Song.youtube_id == "4NRXx6U8ABQ").first()
    assert song is not None

    resp = client.get(f"/api/v2/songs/{song.id}/source")
    assert resp.status_code == 200
    data = resp.json()
    assert data["song_id"] == song.id
    assert data["source_type"] == "curated_seed"
    assert data["source_id"] == "4NRXx6U8ABQ"
    assert data["status"] == "ACTIVE"

    # Nonexistent song_id -> 404
    bad_resp = client.get("/api/v2/songs/nonexistent-uuid-1234/source")
    assert bad_resp.status_code == 404

    # Song with no source -> 404
    song_no_source = Song(
        title="Orphan Song",
        normalized_title="orphan song",
        artist_id=song.artist_id,
        genre="Ambient",
        language="English",
    )
    db_session.add(song_no_source)
    db_session.commit()

    no_source_resp = client.get(f"/api/v2/songs/{song_no_source.id}/source")
    assert no_source_resp.status_code == 404
