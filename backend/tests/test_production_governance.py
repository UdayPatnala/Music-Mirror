import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.db.database import Base, get_db
from app.db.models import UserMusicPreference, Song, Artist
from app.ingestion.ingestion_service import IngestionService
from app.services.recommendation_engine import RecommendationService
from app.core.rate_limiter import MemoryRateLimiter
from app.main import app

TEST_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
connection = engine.connect()
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, expire_on_commit=False, bind=connection)


@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=connection)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=connection)
        Base.metadata.create_all(bind=connection)


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


AUTH_HEADERS = {"Authorization": "Bearer gov_user:guser@musicmirror.ai:Governance User"}


# ── 1. USER DATA EXPORT ENDPOINT TEST ─────────────────────────────────────
def test_user_data_export(client, db_session):
    client.put(
        "/api/v2/user/preferences",
        json={"preferred_genres": ["Indie Pop"], "blocked_artists": ["Blocked Artist X"]},
        headers=AUTH_HEADERS,
    )
    res = client.get("/api/v2/user/preferences/export", headers=AUTH_HEADERS)
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "success"
    assert data["user_id"] == "gov_user"
    assert "Indie Pop" in data["profile"]["preferred_genres"]
    assert "Blocked Artist X" in data["profile"]["blocked_artists"]


# ── 2. BLOCKLIST ENFORCEMENT BEFORE CANDIDATE RANKING ─────────────────────
def test_blocklist_artist_exclusion(client, db_session):
    IngestionService.seed_database(db_session)
    # Block Sid Sriram
    client.put(
        "/api/v2/user/preferences",
        json={"blocked_artists": ["Sid Sriram"]},
        headers=AUTH_HEADERS,
    )
    _, recs = RecommendationService.recommend("happy", user_id="gov_user", db=db_session)
    # Sid Sriram must be 100% excluded from candidate feed
    artists_in_feed = [r["artist"].lower() for r in recs]
    assert not any("sid sriram" in a for a in artists_in_feed)


# ── 3. RATE LIMITER PROTECTION TEST ───────────────────────────────────────
def test_rate_limiter_protection():
    limiter = MemoryRateLimiter(requests_per_minute=5)
    for _ in range(5):
        assert limiter.check_rate_limit("test_client_ip") is True

    # 6th request must raise 429
    with pytest.raises(Exception) as exc_info:
        limiter.check_rate_limit("test_client_ip")
    assert "429" in str(exc_info.value)
