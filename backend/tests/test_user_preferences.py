import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.db.database import Base, get_db
from app.db.models import UserMusicPreference, Song, Artist
from app.ingestion.ingestion_service import IngestionService
from app.services.recommendation_engine import RecommendationService
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


AUTH_HEADERS = {"Authorization": "Bearer test_user:test_user@musicmirror.ai:Test User"}


# ── 1. USER PREFERENCE CRUD TESTS ─────────────────────────────────────────
def test_get_default_user_preferences(client, db_session):
    response = client.get("/api/v2/user/preferences", headers=AUTH_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert data["user_id"] == "test_user"
    assert data["profile_version"] >= 1
    assert data["discovery_mode"] == "balanced"


def test_update_user_preferences_increments_version(client, db_session):
    payload = {
        "discovery_mode": "more_exploratory",
        "energy_preference": "high",
        "preferred_genres": ["Telugu Pop", "Classic Rock"],
    }
    response = client.put("/api/v2/user/preferences", json=payload, headers=AUTH_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert data["discovery_mode"] == "more_exploratory"
    assert data["profile_version"] == 2


def test_reset_user_preferences(client, db_session):
    client.put("/api/v2/user/preferences", json={"discovery_mode": "more_exploratory"}, headers=AUTH_HEADERS)
    response = client.post("/api/v2/user/preferences/reset", headers=AUTH_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert data["discovery_mode"] == "balanced"
    assert data["profile_version"] == 3


def test_unauthenticated_access_fails(client):
    response = client.get("/api/v2/user/preferences")
    assert response.status_code == 401
    assert "Authentication required" in response.json()["detail"]
