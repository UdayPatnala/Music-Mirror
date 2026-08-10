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


def populate_stress_catalog(db):
    """Populate database with complex, edge-case, and boundary catalog data."""
    # Artist 1
    artist1 = Artist(name="Daft Punk", normalized_name="daft punk", genres="Electronic, Synthpop")
    # Artist 2
    artist2 = Artist(name="A. R. Rahman", normalized_name="a r rahman", genres="Soundtrack, Classical")
    # Artist 3 (Unicode & Special chars)
    artist3 = Artist(name="Björk", normalized_name="bjork", genres="Experimental, Art Pop")
    db.add_all([artist1, artist2, artist3])
    db.commit()

    # Songs
    s1 = Song(
        title="One More Time",
        normalized_title="one more time",
        artist_id=artist1.id,
        genre="Electronic",
        sub_genre="House",
        language="English",
        mood="energetic",
        tags="dance, electronic, 90s, classic",
        popularity=95,
        energy=0.9,
        valence=0.85,
        youtube_id="FGBhQbmPwH8",
    )
    s2 = Song(
        title="Roja Janeman",
        normalized_title="roja janeman",
        artist_id=artist2.id,
        genre="Soundtrack",
        sub_genre="Melody",
        language="Hindi",
        mood="romantic",
        tags="romantic, classic, 90s, hindi",
        popularity=85,
        energy=0.4,
        valence=0.6,
        youtube_id="roja_123",
    )
    s3 = Song(
        title="Army of Me",
        normalized_title="army of me",
        artist_id=artist3.id,
        genre="Experimental",
        sub_genre="Industrial",
        language="English",
        mood="aggressive",
        tags="electronic, experimental, dark, 90s",
        popularity=78,
        energy=0.85,
        valence=0.3,
        youtube_id="army_456",
    )
    s4 = Song(
        title="Orphan Track Without Source",
        normalized_title="orphan track without source",
        artist_id=artist1.id,
        genre="Pop",
        language="English",
        mood="neutral",
        tags="pop, orphan",
        popularity=10,
    )
    db.add_all([s1, s2, s3, s4])
    db.commit()

    # Sources for s1 (Multiple sources with different statuses and priorities)
    src1_1 = SongSource(
        song_id=s1.id,
        source_type="youtube",
        source_id="yt_s1_p2",
        status="ACTIVE",
        priority=2,
        reliability_score=0.9,
        health_score=0.95,
    )
    src1_2 = SongSource(
        song_id=s1.id,
        source_type="jamendo",
        source_id="jam_s1_p1",
        status="ACTIVE",
        priority=1,
        reliability_score=0.98,
        health_score=0.99,
    )
    db.add_all([src1_1, src1_2])

    # Sources for s2 (Only DEGRADED or BLOCKED sources)
    src2_1 = SongSource(
        song_id=s2.id,
        source_type="youtube",
        source_id="yt_s2_deg",
        status="DEGRADED",
        priority=1,
        reliability_score=0.7,
        health_score=0.5,
    )
    src2_2 = SongSource(
        song_id=s2.id,
        source_type="spotify",
        source_id="sp_s2_blk",
        status="BLOCKED",
        priority=2,
        reliability_score=0.3,
        health_score=0.1,
    )
    db.add_all([src2_1, src2_2])
    db.commit()

    return {"artist1": artist1, "artist2": artist2, "s1": s1, "s2": s2, "s3": s3, "s4": s4}


# ── 1. CATALOG SEARCH STRESS TESTS ─────────────────────────────────────────

def test_catalog_search_edge_cases(client, db_session):
    populate_stress_catalog(db_session)

    # Search with special characters, symbols, SQL injection patterns
    for special_q in ["!@#$%^&*()", "'; DROP TABLE songs; --", "%", "_", "   ", "🎵🎶"]:
        resp = client.get(f"/api/v2/songs?search={special_q}")
        assert resp.status_code == 200, f"Failed on search query: {special_q}"
        data = resp.json()
        assert "items" in data
        assert isinstance(data["items"], list)

    # Search via /api/v2/songs/search endpoint
    resp = client.get("/api/v2/songs/search?q=One%20More")
    assert resp.status_code == 200
    results = resp.json()
    assert len(results) >= 1
    assert results[0]["title"] == "One More Time"

    # Search endpoint with non-matching query
    resp = client.get("/api/v2/songs/search?q=NonExistentTrack999")
    assert resp.status_code == 200
    assert resp.json() == []

    # Search endpoint min length validation
    resp = client.get("/api/v2/songs/search?q=")
    assert resp.status_code == 422


# ── 2. TAG SUBSTRING MATCHING STRESS TESTS ──────────────────────────────────

def test_tag_substring_matching(client, db_session):
    populate_stress_catalog(db_session)

    # Full tag match
    resp = client.get("/api/v2/songs?tag=electronic")
    assert resp.status_code == 200
    data = resp.json()
    titles = [s["title"] for s in data["items"]]
    assert "One More Time" in titles
    assert "Army of Me" in titles

    # Partial substring tag match ("electr" should match "electronic")
    resp = client.get("/api/v2/songs?tag=electr")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 2

    # Common tag "90s" present across multiple songs
    resp = client.get("/api/v2/songs?tag=90s")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 3

    # Case insensitive tag search
    resp = client.get("/api/v2/songs?tag=DANCE")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["items"][0]["title"] == "One More Time"

    # Tag search with no match
    resp = client.get("/api/v2/songs?tag=jazz2026")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 0
    assert data["items"] == []


# ── 3. TAXONOMY AGGREGATION STRESS TESTS ────────────────────────────────────

def test_taxonomy_aggregation_empty_db(client, db_session):
    """Taxonomy endpoint on clean empty database should return zero counts without 500 error."""
    resp = client.get("/api/v2/songs/meta/taxonomy")
    assert resp.status_code == 200
    data = resp.json()
    assert data["genres"] == []
    assert data["moods"] == []
    assert data["tags"] == []
    assert data["total_genres"] == 0
    assert data["total_moods"] == 0
    assert data["total_tags"] == 0


def test_taxonomy_aggregation_populated_db(client, db_session):
    populate_stress_catalog(db_session)

    resp = client.get("/api/v2/songs/meta/taxonomy")
    assert resp.status_code == 200
    data = resp.json()

    assert data["total_genres"] == 4  # Electronic, Soundtrack, Experimental, Pop
    assert data["total_moods"] == 4   # energetic, romantic, aggressive, neutral
    assert data["total_tags"] >= 8

    # Verify counts match returned list lengths
    assert data["total_genres"] == len(data["genres"])
    assert data["total_moods"] == len(data["moods"])
    assert data["total_tags"] == len(data["tags"])

    # Check individual genre DTO contents
    genre_names = [g["name"] for g in data["genres"]]
    assert "Electronic" in genre_names

    # Check sub-endpoints /meta/genres, /meta/moods, /meta/tags
    assert client.get("/api/v2/songs/meta/genres").status_code == 200
    assert client.get("/api/v2/songs/meta/moods").status_code == 200
    assert client.get("/api/v2/songs/meta/tags").status_code == 200


# ── 4. SOURCE RESOLUTION STRESS TESTS ───────────────────────────────────────

def test_source_resolution(client, db_session):
    objs = populate_stress_catalog(db_session)
    s1, s2, s4 = objs["s1"], objs["s2"], objs["s4"]

    # s1 has two active sources: jam_s1_p1 (Priority 1) and yt_s1_p2 (Priority 2)
    # Must resolve to Priority 1 active source
    resp = client.get(f"/api/v2/songs/{s1.id}/source")
    assert resp.status_code == 200
    data = resp.json()
    assert data["source_id"] == "jam_s1_p1"
    assert data["status"] == "ACTIVE"

    # s2 has NO active sources, only DEGRADED (reliability 0.7) and BLOCKED (reliability 0.3)
    # Must fall back to non-active source with highest reliability (yt_s2_deg)
    resp = client.get(f"/api/v2/songs/{s2.id}/source")
    assert resp.status_code == 200
    data = resp.json()
    assert data["source_id"] == "yt_s2_deg"
    assert data["status"] == "DEGRADED"

    # s4 is an orphan song with NO records in SongSource
    # Must return 404 HTTP Exception, NOT 500 error
    resp = client.get(f"/api/v2/songs/{s4.id}/source")
    assert resp.status_code == 404
    assert "No playable source found" in resp.json()["detail"]

    # Non-existent song_id must return 404
    resp = client.get("/api/v2/songs/nonexistent-song-id-9999/source")
    assert resp.status_code == 404
    assert "not found" in resp.json()["detail"]


# ── 5. NON-500 EDGE CASES & BOUNDARY VERIFICATIONS ─────────────────────────

def test_non_500_edge_cases(client, db_session):
    populate_stress_catalog(db_session)

    # Invalid song ID lookup
    resp = client.get("/api/v2/songs/invalid-id-xyz")
    assert resp.status_code == 404

    # Out of range pagination
    resp = client.get("/api/v2/songs?page=999&limit=50")
    assert resp.status_code == 200
    data = resp.json()
    assert data["items"] == []
    assert data["total"] > 0

    # Conflicting audio feature ranges (min > max)
    resp = client.get("/api/v2/songs?energy_min=0.99&energy_max=0.01")
    assert resp.status_code == 200
    assert resp.json()["items"] == []

    # POST ingestion invalid payload (missing required field)
    resp = client.post("/api/v2/songs", json={"genre": "Pop"})
    assert resp.status_code in [400, 422]
