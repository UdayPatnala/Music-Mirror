from __future__ import annotations
import sys
from pathlib import Path
from typing import Any

backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.services.recommendation_engine import (
    RecommendationService, 
    SONGS, 
    DEFAULT_WEIGHTS, 
    EMOTION_TARGETS, 
    EMOTION_MAP
)

normalize_emotion = RecommendationService.normalize_emotion
extract_song_features = RecommendationService.extract_song_features

def compute_feature_similarity(
    song_features: dict[str, float], 
    target_features: dict[str, float], 
    weights: dict[str, float] | None = None
) -> float:
    return RecommendationService.compute_euclidean(song_features, target_features, weights)

def recommend_songs(
    emotion: Any, 
    user_genre: str | None = None, 
    user_goal: str | None = None, 
    limit: int = 20,
    min_score: float | None = None,
    genre_filter: str | None = None
) -> tuple[str, list[dict[str, Any]]]:
    return RecommendationService.recommend(
        emotion=emotion,
        user_genre=user_genre,
        user_goal=user_goal,
        limit=limit,
        min_score=min_score,
        genre_filter=genre_filter
    )

__all__ = [
    "normalize_emotion",
    "extract_song_features",
    "compute_feature_similarity",
    "recommend_songs",
    "SONGS",
    "DEFAULT_WEIGHTS",
    "EMOTION_TARGETS",
    "EMOTION_MAP",
    "RecommendationService",
]
