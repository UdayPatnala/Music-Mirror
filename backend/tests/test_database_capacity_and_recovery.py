import pytest
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.db.database import Base, get_db, DB_PATH
from app.db.models import UserMusicPreference, Song, Artist, SongSource
from app.db.backup import DatabaseBackupManager
from app.ingestion.ingestion_service import IngestionService
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
        # Clean up tables between test runs
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


AUTH_HEADERS = {"Authorization": "Bearer capacity_user:cuser@musicmirror.ai:Capacity User"}


# ── 1. DATABASE HEALTH & OBSERVABILITY ENDPOINT ───────────────────────────
def test_database_health_endpoint(client, db_session):
    response = client.get("/health/database")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "query_latency_ms" in data["database"]
    assert "table_counts" in data
    assert "songs" in data["table_counts"]


# ── 2. DATABASE BACKUP AND RESTORATION VERIFICATION ───────────────────────
def test_database_backup_and_restoration(tmp_path, db_session):
    # Seed database
    IngestionService.seed_database(db_session)

    # Ensure actual SQLite database file exists for snapshot test
    if not Path(DB_PATH).exists():
        file_engine = create_engine(f"sqlite:///{DB_PATH}")
        Base.metadata.create_all(bind=file_engine)
        file_engine.dispose()

    backup_file = DatabaseBackupManager.create_backup(dest_dir=tmp_path)
    assert backup_file.exists()

    is_valid = DatabaseBackupManager.verify_restoration(backup_file)
    assert is_valid is True


# ── 3. ACCOUNT DELETION & GLOBAL CATALOG PRESERVATION ─────────────────────
def test_user_account_deletion_preserves_catalog(client, db_session):
    IngestionService.seed_database(db_session)

    # Create user preferences
    client.put("/api/v2/user/preferences", json={"discovery_mode": "more_exploratory"}, headers=AUTH_HEADERS)

    song_count_before = db_session.query(Song).count()

    # Delete user account data
    del_res = client.delete("/api/v2/user/preferences/account", headers=AUTH_HEADERS)
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "success"

    # Verify user preference deleted
    pref = db_session.query(UserMusicPreference).filter(UserMusicPreference.user_id == "capacity_user").first()
    assert pref is None

    # Verify shared global song catalog remains intact
    song_count_after = db_session.query(Song).count()
    assert song_count_after == song_count_before


# ── 4. SONG SOURCE AVAILABILITY STATUS TRANSITIONS ────────────────────────
def test_song_source_status_transitions(db_session):
    artist = Artist(name="Test Artist", normalized_name="test artist")
    db_session.add(artist)
    db_session.flush()

    song = Song(title="Test Track", normalized_title="test track", artist_id=artist.id, genre="Pop", duration=200)
    db_session.add(song)
    db_session.flush()

    source = SongSource(song_id=song.id, source_type="youtube", source_id="abc123xyz", status="ACTIVE")
    db_session.add(source)
    db_session.commit()

    assert source.status == "ACTIVE"

    # Transition source status upon provider restriction
    source.status = "UNAVAILABLE"
    db_session.commit()

    db_session.refresh(source)
    assert source.status == "UNAVAILABLE"
    # Canonical song remains preserved
    assert db_session.query(Song).filter(Song.id == song.id).first() is not None
