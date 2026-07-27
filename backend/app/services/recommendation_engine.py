from __future__ import annotations
import json
import math
import random
from datetime import datetime
from pathlib import Path
from typing import Any

DATA_PATH = Path(__file__).parent.parent.parent.parent / "data" / "songs.json"

try:
    with DATA_PATH.open("r", encoding="utf-8") as file:
        SONGS: dict[str, list[dict[str, Any]]] = json.load(file)
except Exception:
    SONGS = {}

EMOTION_MAP = {
    "surprised": "surprise", "fearful": "sad", "disgusted": "angry", 
    "joyful": "happy", "excited": "happy", "depressed": "sad", 
    "enraged": "angry", "calm": "neutral"
}

EMOTION_TARGETS = {
    "happy": {"valence": 0.90, "energy": 0.85, "tempo": 0.75},
    "sad": {"valence": 0.15, "energy": 0.25, "tempo": 0.30},
    "angry": {"valence": 0.25, "energy": 0.90, "tempo": 0.85},
    "neutral": {"valence": 0.50, "energy": 0.50, "tempo": 0.50},
    "surprise": {"valence": 0.75, "energy": 0.80, "tempo": 0.70},
}

DEFAULT_WEIGHTS = {"valence": 0.4, "energy": 0.4, "tempo": 0.2}

class RecommendationService:
    @staticmethod
    def normalize_emotion(emotion: str) -> str:
        if not emotion: return "neutral"
        cleaned = emotion.strip().lower()
        return EMOTION_MAP.get(cleaned, cleaned)

    @staticmethod
    def extract_song_features(song: dict[str, Any]) -> dict[str, float]:
        valence = float(song.get("valence", 0.5))
        energy = float(song.get("energy_numeric", song.get("energy_score", 0.5)))
        tempo = float(song.get("tempo", 0.5))
        if "bpm" in song:
            tempo = max(0.0, min(1.0, (float(song["bpm"]) - 60.0) / 120.0))
        return {"valence": valence, "energy": energy, "tempo": tempo}

    @staticmethod
    def calculate_context_score(song: dict[str, Any], hour: int, goal: str) -> float:
        score = 0.0
        energy = float(song.get("energy_numeric", 0.5))
        valence = float(song.get("valence", 0.5))
        
        # Time of day Context
        if 5 <= hour < 12 and energy > 0.6: score += 0.1
        elif 17 <= hour < 22 and energy < 0.5: score += 0.1
        elif 22 <= hour or hour < 5 and energy < 0.3: score += 0.15
        
        # Goal Context
        if "focus" in goal and 0.4 <= energy <= 0.6: score += 0.2
        if "relax" in goal and energy < 0.4: score += 0.2
        if "lift" in goal and valence > 0.7: score += 0.2
        
        return score

    @staticmethod
    def calculate_diversity_penalty(song: dict[str, Any], artist_history: dict[str, int]) -> float:
        artist = song.get("artist", "Unknown")
        count = artist_history.get(artist, 0)
        return min(0.5, count * 0.15)

    @staticmethod
    def compute_euclidean(song_features: dict[str, float], target_features: dict[str, float], weights: dict[str, float]) -> float:
        total = sum(weights.values())
        if total == 0: return 0.0
        sq_dist = sum(weights[k] * ((song_features.get(k, 0.5) - target_features.get(k, 0.5)) ** 2) for k in weights)
        return round(max(0.0, 1.0 - math.sqrt(sq_dist / total)), 4)

    @classmethod
    def recommend(cls, emotion: str, user_genre: str | None = None, user_goal: str | None = None, limit: int = 20) -> tuple[str, list[dict[str, Any]]]:
        normalized = cls.normalize_emotion(emotion)
        target_profile = EMOTION_TARGETS.get(normalized, EMOTION_TARGETS["neutral"]).copy()
        weights = DEFAULT_WEIGHTS.copy()
        goal = (user_goal or "").lower()
        
        # Transition Engine: Smooth targets based on goal
        if "lift" in goal:
            target_profile["energy"] = min(1.0, target_profile["energy"] + 0.2)
            target_profile["valence"] = min(1.0, target_profile["valence"] + 0.3)
        elif "relax" in goal:
            target_profile["energy"] = max(0.0, target_profile["energy"] - 0.3)

        candidates = [s for cat in SONGS.values() for s in cat]
        
        # Deduplication
        seen, deduped = set(), []
        for c in candidates:
            c_str = str(c.get("name",""))+str(c.get("artist",""))
            if c_str not in seen:
                seen.add(c_str)
                deduped.append(c)

        scored = []
        artist_counts = {}
        hour = datetime.now().hour
        
        for song in deduped:
            # 1. Similarity Score
            feats = cls.extract_song_features(song)
            similarity = cls.compute_euclidean(feats, target_profile, weights)
            
            # 2. Context Score
            context = cls.calculate_context_score(song, hour, goal)
            
            # 3. Preference Score
            song_genre = str(song.get("genre", "")).lower()
            preference = 0.2 if user_genre and user_genre.lower() != "any" and user_genre.lower() in song_genre else 0.0
            
            # 4. Diversity / Penalty Engine
            penalty = cls.calculate_diversity_penalty(song, artist_counts)
            if user_genre and user_genre.lower() != "any" and user_genre.lower() not in song_genre:
                penalty += 0.3
                
            # 5. Discovery / Novelty Score
            popularity = float(song.get("popularity", 50)) / 100.0
            novelty = (popularity - 0.5) * 0.05
            
            final_score = similarity + context + preference + novelty - penalty
            final_score = max(0.0, min(1.0, final_score))
            
            if final_score > 0.4:
                artist = song.get("artist", "Unknown")
                artist_counts[artist] = artist_counts.get(artist, 0) + 1
                
                s = song.copy()
                s["recommendation_score"] = round(final_score, 3)
                s["audio_features"] = feats
                
                # Explainable AI
                reasons = [f"{int(similarity*100)}% acoustic match"]
                if context > 0: reasons.append("fits context")
                if preference > 0: reasons.append("matches your taste")
                s["recommendation_reason"] = " · ".join(reasons)
                
                scored.append(s)
                
        scored.sort(key=lambda x: x["recommendation_score"], reverse=True)
        return normalized, scored[:limit]
