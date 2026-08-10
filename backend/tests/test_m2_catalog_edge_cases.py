import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.db.database import Base, get_db
from app.db.models import Song, Artist, Album
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


def seed_sample_data(db_session):
    songs_data = [
        {
            "title": "Midnight City",
            "artist_name": "M83",
            "album_title": "Hurry Up, We're Dreaming",
            "genre": "Indie Electronic",
            "sub_genre": "Synthwave",
            "language": "English",
            "mood": "euphoric",
            "tags": "electronic, synth, nocturnal",
            "energy": 0.85,
            "valence": 0.6,
            "danceability": 0.65,
            "explicit": False,
            "youtube_id": "dX3k_QDnzHE",
            "popularity": 88,
        },
        {
            "title": "Stargazing",
            "artist_name": "Travis Scott",
            "album_title": "Astroworld",
            "genre": "Hip-Hop",
            "sub_genre": "Trap",
            "language": "English",
            "mood": "psychedelic",
            "tags": "trap, rap, trippy",
            "energy": 0.78,
            "valence": 0.4,
            "danceability": 0.7,
            "explicit": True,
            "youtube_id": "2a8PgqWzwlc",
            "popularity": 91,
        },
    ]
    for song in songs_data:
        IngestionService.ingest_song_record(db_session, song, source_type="test_seed")


# ── 1. EMPTY DATABASE QUERIES ────────────────────────────────────────────────
def test_empty_database_queries(client):
    # GET /api/v2/songs on completely empty DB
    resp = client.get("/api/v2/songs")
    assert resp.status_code == 200
    data = resp.json()
    assert data["items"] == []
    assert data["total"] == 0
    assert data["page"] == 1
    assert data["limit"] == 20
    assert data["total_pages"] == 1

    # GET /api/v2/songs/meta/taxonomy on empty DB
    resp_tax = client.get("/api/v2/songs/meta/taxonomy")
    assert resp_tax.status_code == 200
    tax_data = resp_tax.json()
    assert tax_data["genres"] == []
    assert tax_data["moods"] == []
    assert tax_data["tags"] == []
    assert tax_data["total_genres"] == 0
    assert tax_data["total_moods"] == 0
    assert tax_data["total_tags"] == 0

    # GET /meta/genres, /meta/moods, /meta/tags on empty DB
    assert client.get("/api/v2/songs/meta/genres").json() == []
    assert client.get("/api/v2/songs/meta/moods").json() == []
    assert client.get("/api/v2/songs/meta/tags").json() == []


# ── 2. NON-EXISTENT GENRE / MOOD / TAG COMBINATIONS ──────────────────────────
def test_non_existent_genre_mood_combinations(client, db_session):
    seed_sample_data(db_session)

    # Non-existent genre
    resp = client.get("/api/v2/songs?genre=NonExistentGenre999")
    assert resp.status_code == 200
    assert resp.json()["items"] == []
    assert resp.json()["total"] == 0

    # Non-existent mood
    resp = client.get("/api/v2/songs?mood=UltraHyperMood")
    assert resp.status_code == 200
    assert resp.json()["items"] == []

    # Mismatched valid genre + invalid mood
    resp = client.get("/api/v2/songs?genre=Hip-Hop&mood=euphoric")
    assert resp.status_code == 200
    assert resp.json()["items"] == []

    # Non-existent sub_genre, language, tag
    assert client.get("/api/v2/songs?sub_genre=Polka").json()["total"] == 0
    assert client.get("/api/v2/songs?language=Klingon").json()["total"] == 0
    assert client.get("/api/v2/songs?tag=nonexistenttag123").json()["total"] == 0
    assert client.get("/api/v2/songs?artist_id=00000000-0000-0000-0000-000000000000").json()["total"] == 0


# ── 3. CONTRADICTORY & INVALID RANGE PARAMETERS ────────────────────────────
def test_range_parameters_edge_cases(client, db_session):
    seed_sample_data(db_session)

    # Contradictory range: min > max (energy_min=0.9 & energy_max=0.1) -> non-500, returns empty
    resp = client.get("/api/v2/songs?energy_min=0.9&energy_max=0.1")
    assert resp.status_code == 200
    assert resp.json()["items"] == []
    assert resp.json()["total"] == 0

    # Contradictory range: valence_min=0.9 & valence_max=0.1
    resp = client.get("/api/v2/songs?valence_min=0.9&valence_max=0.1")
    assert resp.status_code == 200
    assert resp.json()["items"] == []

    # Invalid energy_min out of range (< 0.0) -> FastAPI Validation Error 422
    resp_invalid = client.get("/api/v2/songs?energy_min=-0.5")
    assert resp_invalid.status_code == 422

    # Invalid energy_max out of range (> 1.0) -> FastAPI Validation Error 422
    resp_invalid = client.get("/api/v2/songs?energy_max=1.5")
    assert resp_invalid.status_code == 422


# ── 4. MISSING REQUIRED INGESTION FIELDS & INVALID PAYLOADS ─────────────────
def test_post_songs_ingestion_edge_cases(client, db_session):
    # Minimal valid payload with defaults
    valid_minimal = {
        "title": "Minimal Song",
        "artist_name": "Minimal Artist",
    }
    resp = client.post("/api/v2/songs", json=valid_minimal)
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Minimal Song"
    assert data["artist_name"] == "Minimal Artist"
    assert data["genre"] == "Pop"  # default
    assert data["duration"] == 180  # default

    # Missing required title -> 422 Unprocessable Entity
    no_title = {"artist_name": "Artist Without Title"}
    resp = client.post("/api/v2/songs", json=no_title)
    assert resp.status_code in [400, 422]

    # Missing required artist_name -> 422 Unprocessable Entity
    no_artist = {"title": "Title Without Artist"}
    resp = client.post("/api/v2/songs", json=no_artist)
    assert resp.status_code in [400, 422]

    # Whitespace-only title -> 400 Bad Request (handled by IngestionService ValueError)
    ws_title = {"title": "   ", "artist_name": "Valid Artist"}
    resp = client.post("/api/v2/songs", json=ws_title)
    assert resp.status_code in [400, 422]

    # Invalid popularity > 100 -> 422
    bad_pop = {"title": "Overpowered", "artist_name": "Singer", "popularity": 999}
    resp = client.post("/api/v2/songs", json=bad_pop)
    assert resp.status_code == 422

    # Invalid energy > 1.0 -> 422
    bad_energy = {"title": "Hyper", "artist_name": "Singer", "energy": 5.0}
    resp = client.post("/api/v2/songs", json=bad_energy)
    assert resp.status_code == 422


# ── 5. INGESTION IDEMPOTENCY & DEDUPLICATION ────────────────────────────────
def test_ingestion_idempotency(client, db_session):
    payload = {
        "title": "Idempotent Track",
        "artist_name": "Repeat Artist",
        "album_title": "Single",
        "genre": "Rock",
        "youtube_id": "repeat_123",
    }

    # Ingest 1st time
    resp1 = client.post("/api/v2/songs", json=payload)
    assert resp1.status_code == 201
    song1 = resp1.json()

    # Ingest 2nd time with exact same title & artist
    resp2 = client.post("/api/v2/songs", json=payload)
    assert resp2.status_code == 201
    song2 = resp2.json()

    assert song1["id"] == song2["id"]  # Deduplicated to same song ID

    # Verify catalog count is 1
    resp_cat = client.get("/api/v2/songs?search=Idempotent")
    assert resp_cat.status_code == 200
    assert resp_cat.json()["total"] == 1


# ── 6. SPECIAL CHARACTERS & SQL WILDCARD RESILIENCE ──────────────────────────
def test_special_character_and_wildcard_resilience(client, db_session):
    seed_sample_data(db_session)

    # Search with SQL wildcards and special characters
    wildcard_searches = ["%", "_", "' OR '1'='1", "DROP TABLE songs;", "<script>alert(1)</script>"]
    for q in wildcard_searches:
        resp = client.get(f"/api/v2/songs?search={q}")
        assert resp.status_code == 200
        assert "items" in resp.json()

    # Tag filter with wildcards
    resp_tag = client.get("/api/v2/songs?tag=%")
    assert resp_tag.status_code == 200
    assert "items" in resp_tag.json()


# ── 7. PAGINATION BOUNDARY CASES ────────────────────────────────────────────
def test_pagination_boundary_cases(client, db_session):
    seed_sample_data(db_session)

    # Out of bounds page
    resp = client.get("/api/v2/songs?page=1000&limit=10")
    assert resp.status_code == 200
    data = resp.json()
    assert data["items"] == []
    assert data["total"] == 2
    assert data["page"] == 1000
    assert data["limit"] == 10
    assert data["total_pages"] == 1  # 2 items / 10 = 1 page total

    # Invalid page=0 or limit=0 -> 422
    assert client.get("/api/v2/songs?page=0").status_code == 422
    assert client.get("/api/v2/songs?limit=0").status_code == 422
    assert client.get("/api/v2/songs?limit=500").status_code == 422
