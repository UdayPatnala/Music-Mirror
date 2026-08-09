import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.db.database import Base, get_db
from app.db.models import UserMusicPreference, Song, Artist
from app.ingestion.ingestion_service import IngestionService
from app.services.recommendation_engine import RecommendationService, diminishing_returns
from app.main import app

TEST_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
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


AUTH_HEADERS = {"Authorization": "Bearer personalization_user:puser@musicmirror.ai:Personalization User"}


# ── 1. COLD START & NEW USER TEST ─────────────────────────────────────────
def test_cold_start_recommendations(client, db_session):
    IngestionService.seed_database(db_session)
    emotion, recs = RecommendationService.recommend("happy", user_id="new_user_123", db=db_session)
    assert emotion == "happy"
    assert len(recs) > 0
    assert "match_score" in recs[0]


# ── 2. EXPLICIT PREFERENCE BOOST ──────────────────────────────────────────
def test_explicit_preference_boost(client, db_session):
    IngestionService.seed_database(db_session)
    # Set explicit preference for Sid Sriram and Telugu Pop
    client.put(
        "/api/v2/user/preferences",
        json={"preferred_artists": ["Sid Sriram"], "preferred_genres": ["Telugu Pop"]},
        headers=AUTH_HEADERS,
    )
    emotion, recs = RecommendationService.recommend("happy", user_id="personalization_user", db=db_session)
    assert len(recs) > 0
    # Top track should reflect Sid Sriram or Telugu Pop boost
    top_artists = [r["artist"].lower() for r in recs[:3]]
    assert any("sid sriram" in a for a in top_artists) or any("telugu" in r.get("genre", "").lower() for r in recs[:3])


# ── 3. SINGLE-ARTIST COLLAPSE PROTECTION ─────────────────────────────────
def test_artist_saturation_diversity_penalty(client, db_session):
    IngestionService.seed_database(db_session)
    emotion, recs = RecommendationService.recommend("happy", limit=20, user_id="personalization_user", db=db_session)
    # Ensure no single artist occupies more than 50% of top 10 feed
    top_10_artists = [r["artist"] for r in recs[:10]]
    from collections import Counter
    counts = Counter(top_10_artists)
    for artist, count in counts.items():
        assert count <= 5, f"Artist {artist} dominated feed with {count} tracks!"


# ── 4. MANIPULATION RESISTANCE & DIMINISHING RETURNS ──────────────────────
def test_diminishing_returns_event_flooding():
    # 1 event gives ~1.0 log scale
    val_1 = diminishing_returns(1)
    # 100 events gives ~5.66, not 100x
    val_100 = diminishing_returns(100)
    assert val_100 < 6.0
    assert val_100 < val_1 * 6.0


# ── 5. ZERO-RESULT ROBUST FALLBACK WATERFALL ──────────────────────────────
def test_robust_fallback_waterfall(client, db_session):
    IngestionService.seed_database(db_session)
    # Query with non-matching genre filter
    emotion, recs = RecommendationService.recommend("happy", genre_filter="NonExistentGenre123", db=db_session)
    # Waterfall fallback should return empty list gracefully without throwing exception
    assert emotion == "happy"
    assert isinstance(recs, list)


# ── 6. PROFILE RESET RESTORES BALANCED BASELINE ───────────────────────────
def test_profile_reset_restores_baseline(client, db_session):
    IngestionService.seed_database(db_session)
    # Mutate to exploratory mode
    client.put("/api/v2/user/preferences", json={"discovery_mode": "more_exploratory"}, headers=AUTH_HEADERS)
    # Reset profile
    res = client.post("/api/v2/user/preferences/reset", headers=AUTH_HEADERS)
    assert res.status_code == 200
    assert res.json()["discovery_mode"] == "balanced"
