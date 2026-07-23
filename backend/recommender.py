from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

DATA_PATH = Path(__file__).parent / "data" / "songs.json"

try:
    with DATA_PATH.open("r", encoding="utf-8") as file:
        SONGS: dict[str, list[dict[str, Any]]] = json.load(file)
except Exception:
    SONGS = {}

EMOTION_MAP: dict[str, str] = {
    "surprised": "surprise",
    "fearful": "sad",
    "disgusted": "angry",
    "joyful": "happy",
    "excited": "happy",
    "depressed": "sad",
    "enraged": "angry",
    "calm": "neutral",
}

# Emotion target profiles: (valence, energy, tempo) normalized 0.0 to 1.0
EMOTION_TARGETS: dict[str, dict[str, float]] = {
    "happy": {"valence": 0.90, "energy": 0.85, "tempo": 0.75},
    "sad": {"valence": 0.15, "energy": 0.25, "tempo": 0.30},
    "angry": {"valence": 0.25, "energy": 0.90, "tempo": 0.85},
    "neutral": {"valence": 0.50, "energy": 0.50, "tempo": 0.50},
    "surprise": {"valence": 0.75, "energy": 0.80, "tempo": 0.70},
}

ENERGY_LABEL_MAP: dict[str, float] = {
    "high": 0.85,
    "bright": 0.80,
    "upbeat": 0.75,
    "elevated": 0.75,
    "medium": 0.50,
    "steady": 0.45,
    "low": 0.25,
}

DEFAULT_WEIGHTS: dict[str, float] = {"valence": 0.4, "energy": 0.4, "tempo": 0.2}


def normalize_emotion(emotion: str) -> str:
    """Normalize input emotion string to standard emotion categories."""
    if not emotion or not isinstance(emotion, str):
        return "neutral"
    cleaned_emotion = emotion.strip().lower()
    return EMOTION_MAP.get(cleaned_emotion, cleaned_emotion)


def extract_song_features(song: dict[str, Any]) -> dict[str, float]:
    """Extract or infer normalized audio features (valence, energy, tempo) for a song."""
    # Explicit features if available
    valence = song.get("valence")
    energy = song.get("energy_numeric") or song.get("energy_score")
    tempo = song.get("tempo")

    # If energy is a qualitative string (e.g. "High", "Upbeat", "Low")
    if energy is None and isinstance(song.get("energy"), str):
        energy_str = song["energy"].strip().lower()
        energy = ENERGY_LABEL_MAP.get(energy_str, 0.5)

    if energy is None:
        energy = 0.5
    else:
        energy = float(energy)

    if valence is None:
        # Infer valence heuristic if missing based on energy and genre
        genre = str(song.get("genre", "")).lower()
        if "pop" in genre or "funk" in genre or "dance" in genre:
            valence = min(1.0, energy + 0.1)
        elif "acoustic" in genre or "ballad" in genre or "soul" in genre:
            valence = max(0.1, energy - 0.1)
        else:
            valence = energy
    else:
        valence = float(valence)

    if tempo is None:
        # Normalize tempo (e.g., 60-180 BPM range mapped to 0.0-1.0)
        raw_tempo = song.get("bpm")
        if raw_tempo is not None:
            tempo = max(0.0, min(1.0, (float(raw_tempo) - 60.0) / 120.0))
        else:
            tempo = energy  # correlated default
    else:
        tempo = float(tempo)

    # Clamp values to [0.0, 1.0]
    return {
        "valence": max(0.0, min(1.0, valence)),
        "energy": max(0.0, min(1.0, energy)),
        "tempo": max(0.0, min(1.0, tempo)),
    }


def compute_feature_similarity(
    song_features: dict[str, float],
    target_features: dict[str, float],
    weights: dict[str, float] | None = None,
) -> float:
    """Compute weighted Euclidean similarity score between song audio features and emotion target profile."""
    if weights is None:
        weights = DEFAULT_WEIGHTS

    total_weight = sum(weights.values())
    if total_weight == 0:
        return 0.0

    sq_dist = 0.0
    for key, weight in weights.items():
        s_val = song_features.get(key, 0.5)
        t_val = target_features.get(key, 0.5)
        sq_dist += weight * ((s_val - t_val) ** 2)

    weighted_dist = math.sqrt(sq_dist / total_weight)
    similarity = max(0.0, 1.0 - weighted_dist)
    return round(similarity, 4)


def recommend_songs(
    emotion: str,
    genre_filter: str | None = None,
    limit: int | None = None,
    min_score: float | None = None,
    weights: dict[str, float] | None = None,
) -> tuple[str, list[dict[str, Any]]]:
    """Recommend songs matched to emotion state using feature-weighted audio matching."""
    normalized_emotion = normalize_emotion(emotion)
    target_profile = EMOTION_TARGETS.get(
        normalized_emotion, EMOTION_TARGETS["neutral"]
    )

    candidates: list[dict[str, Any]] = []
    # Primary pool: songs matching the emotion tag in dataset
    if normalized_emotion in SONGS:
        candidates.extend(SONGS[normalized_emotion])

    # Secondary pool: all other songs for feature-similarity scoring
    for cat, song_list in SONGS.items():
        if cat != normalized_emotion:
            for s in song_list:
                if s not in candidates:
                    candidates.append(s)

    if not candidates:
        return normalized_emotion, []

    scored_songs: list[dict[str, Any]] = []
    for song in candidates:
        # Genre filtering
        if genre_filter:
            song_genre = str(song.get("genre", "")).lower()
            if genre_filter.lower() not in song_genre:
                continue

        feats = extract_song_features(song)
        score = compute_feature_similarity(feats, target_profile, weights)

        if min_score is not None and score < min_score:
            continue

        enriched_song = song.copy()
        enriched_song["recommendation_score"] = score
        enriched_song["audio_features"] = feats
        scored_songs.append(enriched_song)

    # Sort by feature-weighted recommendation score descending
    scored_songs.sort(key=lambda x: x["recommendation_score"], reverse=True)

    if limit is not None and limit > 0:
        scored_songs = scored_songs[:limit]

    return normalized_emotion, scored_songs
