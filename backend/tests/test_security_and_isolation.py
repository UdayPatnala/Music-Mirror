import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.db.database import Base, get_db
from app.db.models import UserMusicPreference, Song, Artist
from app.ingestion.ingestion_service import IngestionService
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


USER_A_AUTH = {"Authorization": "Bearer user_a:usera@musicmirror.ai:User A"}
USER_B_AUTH = {"Authorization": "Bearer user_b:userb@musicmirror.ai:User B"}


# ── 1. USER ISOLATION TESTS ──────────────────────────────────────────────
def test_strict_user_data_isolation(client, db_session):
    # User A updates preferences
    res_a = client.put(
        "/api/v2/user/preferences",
        json={"discovery_mode": "more_exploratory", "preferred_genres": ["Metal"]},
        headers=USER_A_AUTH,
    )
    assert res_a.status_code == 200
    data_a = res_a.json()
    assert data_a["user_id"] == "user_a"
    assert data_a["discovery_mode"] == "more_exploratory"

    # User B fetches preferences
    res_b = client.get("/api/v2/user/preferences", headers=USER_B_AUTH)
    assert res_b.status_code == 200
    data_b = res_b.json()
    assert data_b["user_id"] == "user_b"
    assert data_b["discovery_mode"] == "balanced" # Isolated default state
    assert "Metal" not in data_b["preferred_genres"]


def test_missing_auth_header_fails_safely(client):
    res = client.get("/api/v2/user/preferences")
    assert res.status_code == 401
    assert "Authentication required" in res.json()["detail"]


# ── 2. GLOBAL CATALOG IMMUTABILITY ────────────────────────────────────────
def test_user_preferences_do_not_mutate_global_catalog(client, db_session):
    # Ensure all tables exist on the test engine
    Base.metadata.create_all(bind=engine)

    # Seed canonical catalog
    IngestionService.seed_database(db_session)

    canonical_song = db_session.query(Song).filter(Song.title == "Buttabomma").first()
    assert canonical_song is not None
    original_genre = canonical_song.genre

    # User A selects Heavy Metal preference
    res = client.put(
        "/api/v2/user/preferences",
        json={"preferred_genres": ["Heavy Metal"], "energy_preference": "high"},
        headers=USER_A_AUTH,
    )
    assert res.status_code == 200

    # Verify canonical song record in shared catalog was NOT mutated
    db_session.refresh(canonical_song)
    assert canonical_song.genre == original_genre
