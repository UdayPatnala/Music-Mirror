import pytest
from app.db.models import Song, Artist, SongSource, UserMusicPreference
from app.services.ml_model_ecosystem import (
    ModelRegistry,
    AudioEmbeddingModel,
    MusicMoodModel,
    UserTasteModel,
    SourceReliabilityModel,
    WrongSourceDetectionModel,
)


# ── 1. MODEL REGISTRY TESTS ───────────────────────────────────────────────
def test_model_registry():
    active = ModelRegistry.list_active_models()
    assert len(active) >= 5

    embedding_model = ModelRegistry.get_model_info("audio_embedding_v1")
    assert embedding_model is not None
    assert embedding_model["group"] == "MUSIC_UNDERSTANDING"
    assert embedding_model["fallback"] == "metadata_similarity"


# ── 2. AUDIO EMBEDDING & COSINE SIMILARITY TEST ───────────────────────────
def test_audio_embedding_similarity():
    song_1 = Song(title="Buttabomma", energy=0.80, valence=0.85, duration=198, tempo=120)
    song_2 = Song(title="Buttabomma Lyrical", energy=0.78, valence=0.82, duration=200, tempo=120)
    song_3 = Song(title="Classical Piano Meditation", energy=0.15, valence=0.20, duration=300, tempo=60)

    vec_1 = AudioEmbeddingModel.generate_embedding(song_1)
    assert len(vec_1) == 8

    sim_high = AudioEmbeddingModel.compute_cosine_similarity(song_1, song_2)
    sim_low = AudioEmbeddingModel.compute_cosine_similarity(song_1, song_3)

    assert sim_high > sim_low
    assert sim_high >= 0.70


# ── 3. MUSIC MOOD MODEL TEST ──────────────────────────────────────────────
def test_music_mood_distribution():
    happy_song = Song(title="Happy Track", energy=0.85, valence=0.90)
    moods = MusicMoodModel.predict_mood_distribution(happy_song)

    assert "energetic" in moods
    assert "happy" in moods
    assert moods["energetic"] > 0.30


# ── 4. USER TASTE MODEL TEST ──────────────────────────────────────────────
def test_user_taste_model():
    pref = UserMusicPreference(user_id="ml_user", preferred_genres='["Pop", "Dance"]', energy_preference="high")
    song = Song(title="Upbeat Pop Track", genre="Telugu Pop", energy=0.80)

    score = UserTasteModel.compute_taste_affinity(pref, song)
    assert score >= 0.70


# ── 5. SOURCE RELIABILITY MODEL TEST ─────────────────────────────────────
def test_source_reliability_model():
    healthy_source = SongSource(song_id="s1", source_type="youtube", source_id="v1", success_count=10, failure_count=0, status="ACTIVE")
    failing_source = SongSource(song_id="s1", source_type="youtube", source_id="v2", success_count=0, failure_count=3, status="DEGRADED")

    score_h = SourceReliabilityModel.predict_reliability(healthy_source)
    score_f = SourceReliabilityModel.predict_reliability(failing_source)

    assert score_h > score_f
    assert score_f < 0.50


# ── 6. WRONG SOURCE DETECTION MODEL TEST ──────────────────────────────────
def test_wrong_source_detection_model():
    song = Song(title="Samajavaragamana", duration=214)

    good_source = SongSource(song_id=song.id, source_type="youtube", source_id="v_good", title_at_source="Samajavaragamana Official", duration_at_source=215)
    bad_source = SongSource(song_id=song.id, source_type="youtube", source_id="v_bad", title_at_source="Completely Unrelated Track", duration_at_source=350)

    eval_good = WrongSourceDetectionModel.evaluate_identity_match(song, good_source)
    eval_bad = WrongSourceDetectionModel.evaluate_identity_match(song, bad_source)

    assert eval_good["match"] is True
    assert eval_bad["match"] is False
    assert eval_bad["quarantine_recommended"] is True
