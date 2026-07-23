import pytest
from fastapi.testclient import TestClient
import backend.recommender as recommender
from backend.main import app

client = TestClient(app)

def test_normalize_emotion():
    assert recommender.normalize_emotion("happy") == "happy"
    assert recommender.normalize_emotion("surprised") == "surprise"
    assert recommender.normalize_emotion("fearful") == "sad"
    assert recommender.normalize_emotion("disgusted") == "angry"
    assert recommender.normalize_emotion("JOYFUL") == "happy"
    assert recommender.normalize_emotion("") == "neutral"
    assert recommender.normalize_emotion(None) == "neutral"
    assert recommender.normalize_emotion("unknown_emotion_xyz") == "unknown_emotion_xyz"

def test_extract_song_features_explicit():
    song = {"title": "Test", "valence": 0.8, "energy_numeric": 0.9, "tempo": 0.7}
    feats = recommender.extract_song_features(song)
    assert feats["valence"] == 0.8
    assert feats["energy"] == 0.9
    assert feats["tempo"] == 0.7

def test_extract_song_features_string_energy():
    song_high = {"title": "High Energy Song", "energy": "High", "genre": "Pop"}
    feats_high = recommender.extract_song_features(song_high)
    assert feats_high["energy"] == 0.85

    song_low = {"title": "Low Energy Song", "energy": "Low", "genre": "Ballad"}
    feats_low = recommender.extract_song_features(song_low)
    assert feats_low["energy"] == 0.25

def test_compute_feature_similarity():
    target = {"valence": 0.9, "energy": 0.85, "tempo": 0.75}
    exact = {"valence": 0.9, "energy": 0.85, "tempo": 0.75}
    distant = {"valence": 0.1, "energy": 0.2, "tempo": 0.3}

    score_exact = recommender.compute_feature_similarity(exact, target)
    score_distant = recommender.compute_feature_similarity(distant, target)

    assert score_exact == 1.0
    assert score_distant < 0.5

def test_recommend_songs_mapping_and_ranking():
    norm_emotion, songs = recommender.recommend_songs("happy")
    assert norm_emotion == "happy"
    assert len(songs) > 0
    # Check that songs are sorted by recommendation_score descending
    scores = [s["recommendation_score"] for s in songs]
    assert scores == sorted(scores, reverse=True)
    # Top song for happy should have high valence & energy
    top_song = songs[0]
    assert top_song["audio_features"]["valence"] >= 0.6

def test_recommend_songs_sad_profile():
    norm_emotion, songs = recommender.recommend_songs("sad")
    assert norm_emotion == "sad"
    assert len(songs) > 0
    top_song = songs[0]
    assert top_song["audio_features"]["energy"] <= 0.6

def test_recommend_songs_genre_filtering():
    _, pop_songs = recommender.recommend_songs("happy", genre_filter="Pop")
    for song in pop_songs:
        assert "pop" in song.get("genre", "").lower()

def test_recommend_songs_edge_cases():
    # Limit
    _, limited_songs = recommender.recommend_songs("angry", limit=2)
    assert len(limited_songs) <= 2

    # High min_score threshold
    _, high_score_songs = recommender.recommend_songs("happy", min_score=0.99)
    for song in high_score_songs:
        assert song["recommendation_score"] >= 0.99

    # Unknown emotion falls back to neutral target
    norm_emotion, fallback_songs = recommender.recommend_songs("mysterious_vibe")
    assert norm_emotion == "mysterious_vibe"
    assert len(fallback_songs) > 0

def test_api_recommend_endpoint():
    response = client.post("/recommend", json={"emotion": "happy"})
    assert response.status_code == 200
    data = response.json()
    assert data["emotion"] == "happy"
    assert data["normalized_emotion"] == "happy"
    assert len(data["songs"]) > 0
    assert "recommendation_score" in data["songs"][0]
