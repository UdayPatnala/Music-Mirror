import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from app.db.database import Base, get_db
from app.db.models import Song, Artist, SongSource
from app.core.governance import GovernanceConfig, circuit_breaker_manager, GovernanceAuditLog
from app.services.self_healing_engine import SelfHealingEngine
from app.services.catalog_reconciliation import CatalogReconciler
from app.main import app

TEST_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
connection = engine.connect()
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, expire_on_commit=False, bind=connection)


@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=connection)
    db = TestingSessionLocal()
    circuit_breaker_manager.reset_circuit_breakers()
    GovernanceConfig.safe_mode_active = False
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=connection)
        Base.metadata.create_all(bind=connection)
        circuit_breaker_manager.reset_circuit_breakers()
        GovernanceConfig.safe_mode_active = False


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


AUTH_HEADERS = {"Authorization": "Bearer gov_user:govuser@musicmirror.ai:Governance User"}


# ── 1. CANARY VERIFICATION & SOURCE QUARANTINE TEST ──────────────────────
def test_canary_verification_and_source_quarantine(db_session):
    artist = Artist(name="Armaan Malik", normalized_name="armaan malik")
    db_session.add(artist)
    db_session.flush()

    song = Song(title="Buttabomma", normalized_title="buttabomma", artist_id=artist.id, genre="Pop", duration=198)
    db_session.add(song)
    db_session.flush()

    wrong_source = SongSource(
        song_id=song.id,
        source_type="youtube",
        source_id="bad_id",
        title_at_source="Wrong Video",
        duration_at_source=198,
        status="ACTIVE",
        priority=1,
    )
    candidate_source = SongSource(
        song_id=song.id,
        source_type="youtube",
        source_id="good_id",
        title_at_source="Buttabomma Official Video",
        duration_at_source=198,
        status="ACTIVE",
        priority=2,
    )
    db_session.add_all([wrong_source, candidate_source])
    db_session.commit()

    # Report WRONG_SONG
    res = SelfHealingEngine.record_playback_report(
        db=db_session,
        user_id="gov_user",
        song_id=song.id,
        source_id=wrong_source.id,
        report_type="WRONG_SONG",
    )
    assert res["status"] == "success"

    db_session.refresh(wrong_source)
    db_session.refresh(candidate_source)

    assert wrong_source.status == "QUARANTINED"
    assert candidate_source.status == "ACTIVE"
    assert candidate_source.priority == 1


# ── 2. REPAIR CIRCUIT BREAKER TEST ───────────────────────────────────────
def test_repair_circuit_breaker_activation(db_session):
    assert GovernanceConfig.repair_circuit_breaker_active is False

    for _ in range(5):
        circuit_breaker_manager.record_repair_failure()

    assert GovernanceConfig.repair_circuit_breaker_active is True


# ── 3. SAFE MODE FALLBACK TEST ───────────────────────────────────────────
def test_safe_mode_fallback(db_session):
    GovernanceConfig.safe_mode_active = True

    artist = Artist(name="Test Artist", normalized_name="test artist")
    db_session.add(artist)
    db_session.flush()

    song = Song(title="Test Song", normalized_title="test song", artist_id=artist.id, genre="Pop", duration=180)
    db_session.add(song)
    db_session.commit()

    res = SelfHealingEngine.record_playback_report(
        db=db_session,
        user_id="gov_user",
        song_id=song.id,
        source_id=None,
        report_type="NOT_PLAYING",
    )
    assert res["repair"]["repaired"] is False
    assert "Circuit Breaker or Safe Mode" in res["repair"]["reason"]


# ── 4. CATALOG RECONCILIATION TEST ───────────────────────────────────────
def test_catalog_reconciliation(db_session):
    artist = Artist(name="Sid Sriram", normalized_name="sid sriram")
    db_session.add(artist)
    db_session.flush()

    song = Song(title="Samajavaragamana", normalized_title="samajavaragamana", artist_id=artist.id, genre="Pop", duration=214)
    db_session.add(song)
    db_session.commit()

    # Orphaned source (invalid song_id)
    orphan = SongSource(
        song_id="invalid_song_id",
        source_type="youtube",
        source_id="orphan_id",
        status="ACTIVE",
    )
    db_session.add(orphan)
    db_session.commit()

    report = CatalogReconciler.run_reconciliation(db_session)
    assert report["orphaned_sources_removed"] == 1


# ── 5. GET /health/governance ENDPOINT TEST ──────────────────────────────
def test_governance_health_endpoint(client):
    response = client.get("/health/governance")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "OPERATIONAL"
    assert "governance_config" in data
    assert "catalog_reconciliation" in data
