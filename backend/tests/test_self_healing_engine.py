import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.db.database import Base, get_db
from app.db.models import Song, Artist, SongSource, UserPlaybackReport
from app.services.self_healing_engine import SelfHealingEngine, levenshtein_similarity
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


AUTH_HEADERS = {"Authorization": "Bearer self_healing_user:shuser@musicmirror.ai:Self Healing User"}


# ── 1. LEVENSHTEIN SIMILARITY & CLASSIFICATION TESTS ──────────────────────
def test_levenshtein_similarity():
    assert levenshtein_similarity("Buttabomma", "Buttabomma") == 1.0
    assert levenshtein_similarity("Buttabomma", "Samajavaragamana") < 0.30
    assert levenshtein_similarity("Buttabomma Official Video", "Buttabomma") > 0.50


def test_classify_issue():
    cls_1, conf_1 = SelfHealingEngine.classify_issue("WRONG_SONG")
    assert cls_1 == "WRONG_SONG"
    assert conf_1 == "HIGH"

    cls_2, conf_2 = SelfHealingEngine.classify_issue("NOT_PLAYING", "404")
    assert cls_2 == "SOURCE_UNAVAILABLE"
    assert conf_2 == "HIGH"


# ── 2. IDENTITY MATCHING CONFIDENCE TEST ──────────────────────────────────
def test_match_song_identity(db_session):
    artist = Artist(name="Armaan Malik", normalized_name="armaan malik")
    db_session.add(artist)
    db_session.flush()

    song = Song(title="Buttabomma", normalized_title="buttabomma", artist_id=artist.id, genre="Pop", duration=198)
    db_session.add(song)
    db_session.flush()

    source = SongSource(
        song_id=song.id,
        source_type="youtube",
        source_id="A6BJ-PgNWXA",
        title_at_source="Buttabomma Official Video",
        duration_at_source=200,
        status="ACTIVE",
    )
    db_session.add(source)
    db_session.commit()

    confidence = SelfHealingEngine.match_song_identity(song, source)
    assert confidence >= 0.65


# ── 3. AUTOMATED REPAIR & SOURCE SWITCHING TEST ───────────────────────────
def test_automated_source_repair_and_switching(db_session):
    artist = Artist(name="Sid Sriram", normalized_name="sid sriram")
    db_session.add(artist)
    db_session.flush()

    song = Song(title="Samajavaragamana", normalized_title="samajavaragamana", artist_id=artist.id, genre="Pop", duration=214)
    db_session.add(song)
    db_session.flush()

    # Broken primary source
    source_1 = SongSource(
        song_id=song.id,
        source_type="youtube",
        source_id="broken_video_id",
        title_at_source="Samajavaragamana",
        duration_at_source=214,
        status="ACTIVE",
        priority=1,
    )
    # Healthy secondary candidate source
    source_2 = SongSource(
        song_id=song.id,
        source_type="youtube",
        source_id="healthy_video_id",
        title_at_source="Samajavaragamana Official Video",
        duration_at_source=215,
        status="ACTIVE",
        priority=2,
    )
    db_session.add_all([source_1, source_2])
    db_session.commit()

    # Execute automated repair for broken source_1
    repair = SelfHealingEngine.attempt_automated_repair(db_session, song, source_1, "SOURCE_UNAVAILABLE")
    assert repair["repaired"] is True
    assert repair["new_source_id"] == source_2.id

    db_session.refresh(source_1)
    db_session.refresh(source_2)
    assert source_1.status == "UNAVAILABLE"
    assert source_2.priority == 1 # Promoted to primary


# ── 4. POST /api/v2/reports API ENDPOINT INTEGRATION TEST ─────────────────
def test_submit_playback_report_api(client, db_session):
    artist = Artist(name="Test Artist", normalized_name="test artist")
    db_session.add(artist)
    db_session.flush()

    song = Song(title="Test Song", normalized_title="test song", artist_id=artist.id, genre="Pop", duration=180)
    db_session.add(song)
    db_session.commit()

    payload = {
        "song_id": song.id,
        "report_type": "NOT_PLAYING",
        "description": "Audio fails to start after 5 seconds",
        "error_code": "MEDIA_ERR_SRC_NOT_SUPPORTED",
    }
    response = client.post("/api/v2/reports", json=payload, headers=AUTH_HEADERS)
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "success"
    assert "data" in data
    assert data["data"]["classification"] == "SOURCE_UNAVAILABLE"

    # Verify report record created in database
    report = db_session.query(UserPlaybackReport).filter(UserPlaybackReport.song_id == song.id).first()
    assert report is not None
    assert report.report_type == "NOT_PLAYING"
