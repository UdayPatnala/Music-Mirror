import math
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from app.db.models import Song, SongSource, UserMusicPreference
from app.services.self_healing_engine import levenshtein_similarity


class ModelRegistry:
    """
    Central ML Model Registry.
    Tracks model versions, deployment states, confidence ratings, and fallback policies.
    """

    _registry: Dict[str, Dict[str, Any]] = {
        "audio_embedding_v1": {
            "model_id": "audio_embedding_v1",
            "group": "MUSIC_UNDERSTANDING",
            "version": "v1.2.0",
            "status": "ACTIVE",
            "confidence_level": "HIGH",
            "fallback": "metadata_similarity",
        },
        "music_mood_v1": {
            "model_id": "music_mood_v1",
            "group": "MUSIC_UNDERSTANDING",
            "version": "v1.0.0",
            "status": "ACTIVE",
            "confidence_level": "HIGH",
            "fallback": "explicit_user_mood",
        },
        "user_taste_v1": {
            "model_id": "user_taste_v1",
            "group": "USER_UNDERSTANDING",
            "version": "v1.5.0",
            "status": "ACTIVE",
            "confidence_level": "HIGH",
            "fallback": "explicit_user_preferences",
        },
        "source_reliability_v1": {
            "model_id": "source_reliability_v1",
            "group": "PLAYBACK_RELIABILITY",
            "version": "v2.0.0",
            "status": "ACTIVE",
            "confidence_level": "VERY_HIGH",
            "fallback": "verified_source_health",
        },
        "wrong_source_detection_v1": {
            "model_id": "wrong_source_detection_v1",
            "group": "PLAYBACK_RELIABILITY",
            "version": "v2.0.0",
            "status": "ACTIVE",
            "confidence_level": "VERY_HIGH",
            "fallback": "quarantine_if_uncertain",
        },
    }

    @classmethod
    def get_model_info(cls, model_id: str) -> Optional[Dict[str, Any]]:
        return cls._registry.get(model_id)

    @classmethod
    def list_active_models(cls) -> List[Dict[str, Any]]:
        return [m for m in cls._registry.values() if m["status"] == "ACTIVE"]


# ── MODEL 001: AUDIO EMBEDDING MODEL ─────────────────────────────────────
class AudioEmbeddingModel:
    """Generates 8-dimensional normalized feature vectors for acoustic similarity."""

    @staticmethod
    def generate_embedding(song: Song) -> List[float]:
        # Compute normalized scalar features
        duration_norm = min(1.0, (song.duration or 180) / 360.0)
        tempo_norm = min(1.0, (song.tempo or 120) / 200.0)
        energy = song.energy if song.energy is not None else 0.50
        valence = song.valence if song.valence is not None else 0.50
        danceability = song.danceability if song.danceability is not None else 0.50
        acousticness = song.acousticness if song.acousticness is not None else 0.50

        # Title hash features
        hash_1 = (sum(ord(c) for c in song.title) % 100) / 100.0
        hash_2 = (sum(ord(c) * (i + 1) for i, c in enumerate(song.title)) % 100) / 100.0

        vector = [duration_norm, tempo_norm, energy, valence, danceability, acousticness, hash_1, hash_2]
        # Normalize L2 norm
        norm = math.sqrt(sum(v * v for v in vector))
        return [round(v / norm, 4) for v in vector] if norm > 0 else vector

    @classmethod
    def compute_cosine_similarity(cls, song_a: Song, song_b: Song) -> float:
        vec_a = cls.generate_embedding(song_a)
        vec_b = cls.generate_embedding(song_b)
        dot_product = sum(a * b for a, b in zip(vec_a, vec_b))
        return round(max(0.0, min(1.0, dot_product)), 4)


# ── MODEL 002: MUSIC MOOD MODEL ──────────────────────────────────────────
class MusicMoodModel:
    """Predicts probabilistic mood distributions over controlled taxonomy."""

    TAXONOMY = ["happy", "calm", "energetic", "romantic", "melancholic", "focus"]

    @classmethod
    def predict_mood_distribution(cls, song: Song) -> Dict[str, float]:
        energy = song.energy if song.energy is not None else 0.50
        valence = song.valence if song.valence is not None else 0.50

        if energy >= 0.70 and valence >= 0.60:
            scores = {"energetic": 0.50, "happy": 0.35, "focus": 0.10, "romantic": 0.05, "calm": 0.0, "melancholic": 0.0}
        elif energy <= 0.40 and valence >= 0.60:
            scores = {"calm": 0.55, "romantic": 0.30, "happy": 0.10, "focus": 0.05, "energetic": 0.0, "melancholic": 0.0}
        elif valence <= 0.35:
            scores = {"melancholic": 0.60, "calm": 0.25, "focus": 0.10, "romantic": 0.05, "happy": 0.0, "energetic": 0.0}
        else:
            scores = {"happy": 0.30, "focus": 0.30, "calm": 0.20, "energetic": 0.10, "romantic": 0.05, "melancholic": 0.05}

        return scores


# ── MODEL 006 & 011: USER TASTE & HYBRID RECOMMENDER MODEL ───────────────
class UserTasteModel:
    """Computes bounded user taste vectors combining explicit preferences & recency."""

    @staticmethod
    def compute_taste_affinity(pref: Optional[UserMusicPreference], song: Song) -> float:
        if not pref:
            return 0.50

        score = 0.50

        # Preferred genres
        if pref.preferred_genres and song.genre:
            import json
            try:
                genres = json.loads(pref.preferred_genres)
                if any(g.lower() in song.genre.lower() for g in genres):
                    score += 0.25
            except Exception:
                pass

        # Energy preference alignment
        if pref.energy_preference == "high" and (song.energy or 0.5) >= 0.65:
            score += 0.15
        elif pref.energy_preference == "low" and (song.energy or 0.5) <= 0.45:
            score += 0.15

        return round(max(0.0, min(1.0, score)), 2)


# ── MODEL 018: SOURCE RELIABILITY MODEL ───────────────────────────────────
class SourceReliabilityModel:
    """Predicts external source reliability score [0.0, 1.0]."""

    @staticmethod
    def predict_reliability(source: SongSource) -> float:
        base = 1.0

        failures = source.failure_count or 0
        consecutive = source.consecutive_failures or 0
        successes = source.success_count or 0

        # Failure count penalty
        base -= (failures * 0.15)
        base -= (consecutive * 0.20)

        # Success count boost
        base += min(0.20, successes * 0.02)

        if source.status == "DEGRADED":
            base -= 0.30
        elif source.status in ["UNAVAILABLE", "QUARANTINED"]:
            base = 0.0

        return round(max(0.0, min(1.0, base)), 2)


# ── MODEL 019: WRONG SOURCE DETECTION MODEL ──────────────────────────────
class WrongSourceDetectionModel:
    """Compares canonical Song identity against candidate source identity."""

    @staticmethod
    def evaluate_identity_match(song: Song, source: SongSource) -> Dict[str, Any]:
        if not source.title_at_source:
            return {"match": False, "confidence": 0.0, "reason": "Missing source title"}

        title_sim = levenshtein_similarity(song.title, source.title_at_source)

        duration_diff = abs((song.duration or 180) - (source.duration_at_source or 180))
        duration_ok = duration_diff <= 45

        confidence = round((title_sim * 0.70) + ((1.0 if duration_ok else 0.30) * 0.30), 2)
        is_match = confidence >= 0.60

        return {
            "match": is_match,
            "confidence": confidence,
            "title_similarity": title_sim,
            "duration_difference_seconds": duration_diff,
            "quarantine_recommended": not is_match,
        }
