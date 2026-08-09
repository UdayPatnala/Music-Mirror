import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.db.database import Base, get_db
from app.db.models import Song, Artist, Album, SongSource
from app.ingestion.normalizer import normalize_string, clean_title, extract_artist_and_title
from app.ingestion.deduplication import DeduplicationEngine
from app.ingestion.ingestion_service import IngestionService
from app.main import app

# In-Memory SQLite database for fast unit testing
TEST_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


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


# ── 1. NORMALIZER TESTS ──────────────────────────────────────────────────
def test_normalize_string():
    assert normalize_string("  The Weeknd!  ") == "the weeknd"
    assert normalize_string("ARMAN MALIK & Sid Sriram") == "arman malik sid sriram"


def test_clean_title():
    assert clean_title("Buttabomma (Official Video)") == "Buttabomma"
    assert clean_title("Kesariya [Official Music Video] - 4K HD") == "Kesariya"


def test_extract_artist_and_title():
    artist, title = extract_artist_and_title("Armaan Malik - Buttabomma")
    assert artist == "Armaan Malik"
    assert title == "Buttabomma"


# ── 2. DATABASE & INGESTION TESTS ─────────────────────────────────────────
def test_idempotent_seeding(db_session):
    # First seed
    res1 = IngestionService.seed_database(db_session)
    assert res1["added"] > 0
    assert res1["existing"] == 0

    # Second seed (idempotent duplicate prevention)
    res2 = IngestionService.seed_database(db_session)
    assert res2["added"] == 0
    assert res2["existing"] == res1["added"]


def test_song_duration_formatting(db_session):
    IngestionService.seed_database(db_session)
    song = db_session.query(Song).first()
    assert song is not None
    assert song.duration > 0
    assert isinstance(song.duration, int)


# ── 3. API ENDPOINTS TESTS ────────────────────────────────────────────────
def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_get_songs_api(client, db_session):
    IngestionService.seed_database(db_session)
    response = client.get("/api/v2/songs")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert len(data["items"]) > 0
    first_song = data["items"][0]
    assert "duration" in first_song
    assert "duration_str" in first_song
    assert ":" in first_song["duration_str"]


def test_search_songs_api(client, db_session):
    IngestionService.seed_database(db_session)
    response = client.get("/api/v2/songs/search?q=Buttabomma")
    assert response.status_code == 200
    results = response.json()
    assert len(results) >= 1
    assert "Buttabomma" in results[0]["title"]
