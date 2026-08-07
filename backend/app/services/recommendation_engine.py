from __future__ import annotations
import json
import math
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

TRACK_YOUTUBE_IDS = {
    "blinding lights": "4NRXx6U8ABQ",
    "levitating": "TUVcZfQe-Kw",
    "can't stop the feeling!": "ru0K8uYEZWw",
    "uptown funk": "OPf0YbXqDm0",
    "happy": "ZbZSe6N_BXs",
    "good as hell": "smDa04GcnzA",
    "walking on sunshine": "iPUmE-tne5U",
    "sugar": "09R8_2nJtjg",
    "sunflower": "ApXoWvfEYVU",
    "don't start now": "oygrmJFKYZY",
    "shake it off": "nfWlot6h_JM",
    "someone like you": "hLQl3WQQoQ0",
    "sunset lover": "1G4isv_Fylg",
    "resonance": "8GW6sLrK40k",
    "fix you": "k4V3Mo61hJM",
    "drivers license": "ZmDBbnmKpqQ",
    "all of me": "450p7goxZqg",
    "believer": "7wtfhZwyrYY",
    "radioactive": "ktvTqWscGsw",
    "eye of the tiger": "btPJPFnesV4",
    "stronger": "PsO6ZnUZI0g",
    "numb": "kXYiU_JCYtU",
    "weightless": "UfcAVejslrU",
    "clair de lune": "WNcsUNKlAKw"
}

class RecommendationService:
    @staticmethod
    def normalize_emotion(emotion: Any) -> str:
        if emotion is None:
            return "neutral"
        if isinstance(emotion, (int, float)):
            # Check for float NaN or Inf
            if isinstance(emotion, float) and (math.isnan(emotion) or math.isinf(emotion)):
                return "neutral"
            return "neutral"
        if not isinstance(emotion, str):
            return "neutral"
        
        cleaned = emotion.strip()
        if not cleaned:
            return "neutral"
            
        lower_cleaned = cleaned.lower()
        if lower_cleaned in EMOTION_MAP:
            return EMOTION_MAP[lower_cleaned]
            
        return lower_cleaned

    @staticmethod
    def extract_song_features(song: dict[str, Any]) -> dict[str, float]:
        # 1. Energy
        if "energy_numeric" in song:
            try:
                energy = float(song["energy_numeric"])
            except (ValueError, TypeError):
                energy = 0.5
        elif "energy" in song:
            val = song["energy"]
            if isinstance(val, (int, float)):
                energy = float(val)
            elif isinstance(val, str):
                s_val = val.strip().lower()
                if s_val == "high":
                    energy = 0.85
                elif s_val == "low":
                    energy = 0.25
                else:
                    energy = 0.5
            else:
                energy = 0.5
        else:
            energy = float(song.get("energy_score", 0.5))
        energy = max(0.0, min(1.0, energy))

        # 2. Valence
        if "valence" in song:
            try:
                valence = float(song["valence"])
            except (ValueError, TypeError):
                valence = 0.5
        else:
            genre = str(song.get("genre", "")).lower()
            if "pop" in genre:
                valence = min(1.0, energy + 0.1)
            elif "acoustic" in genre or "ballad" in genre:
                valence = max(0.1, energy - 0.1)
            else:
                valence = 0.5
        valence = max(0.0, min(1.0, valence))

        # 3. Tempo
        if "bpm" in song:
            try:
                bpm_val = float(song["bpm"])
                tempo = (bpm_val - 60.0) / 120.0
            except (ValueError, TypeError):
                tempo = 0.5
        elif "tempo" in song:
            try:
                tempo = float(song["tempo"])
            except (ValueError, TypeError):
                tempo = 0.5
        else:
            tempo = 0.5
        tempo = max(0.0, min(1.0, tempo))

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
    def compute_euclidean(song_features: dict[str, float], target_features: dict[str, float], weights: dict[str, float] | None = None) -> float:
        w = weights if weights is not None else DEFAULT_WEIGHTS
        total = sum(w.values())
        if total == 0:
            return 0.0
        sq_dist = sum(w.get(k, 0.0) * ((song_features.get(k, 0.5) - target_features.get(k, 0.5)) ** 2) for k in target_features)
        dist = math.sqrt(sq_dist / total)
        score = max(0.0, 1.0 - dist)
        return 1.0 if abs(score - 1.0) < 1e-9 else round(score, 4)

    @classmethod
    def recommend(
        cls, 
        emotion: Any, 
        user_genre: str | None = None, 
        user_goal: str | None = None, 
        limit: int = 20,
        min_score: float | None = None,
        genre_filter: str | None = None,
        preferred_languages: list[str] | None = None,
    ) -> tuple[str, list[dict[str, Any]]]:
        normalized = cls.normalize_emotion(emotion)
        
        if limit == 0:
            return normalized, []

        target_profile = EMOTION_TARGETS.get(normalized, EMOTION_TARGETS["neutral"]).copy()
        weights = DEFAULT_WEIGHTS.copy()
        goal = (user_goal or "").lower()
        effective_genre = genre_filter if genre_filter is not None else user_genre

        # Transition Engine: Smooth targets based on goal
        if "lift" in goal:
            target_profile["energy"] = min(1.0, target_profile["energy"] + 0.2)
            target_profile["valence"] = min(1.0, target_profile["valence"] + 0.3)
        elif "relax" in goal:
            target_profile["energy"] = max(0.0, target_profile["energy"] - 0.3)

        # Collect candidate pool (first check specific mood bucket, fallback to all)
        mood_bucket = SONGS.get(normalized, [])
        all_songs = [s for cat in SONGS.values() for s in cat]
        candidates = mood_bucket + all_songs

        # Filter by genre if genre_filter or user_genre is explicitly specified
        if effective_genre and effective_genre.lower() != "any":
            target_g = effective_genre.lower()
            matching_candidates = [c for c in candidates if target_g in str(c.get("genre", "")).lower()]
            if genre_filter is not None:
                candidates = matching_candidates
            elif matching_candidates:
                candidates = matching_candidates + [c for c in candidates if c not in matching_candidates]

        # Deduplication
        seen, deduped = set(), []
        for c in candidates:
            c_str = str(c.get("title", c.get("name", "")))+str(c.get("artist", ""))
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
            preference = 0.2 if effective_genre and effective_genre.lower() != "any" and effective_genre.lower() in song_genre else 0.0
            
            # 4. Diversity / Penalty Engine
            penalty = cls.calculate_diversity_penalty(song, artist_counts)
            if effective_genre and effective_genre.lower() != "any" and effective_genre.lower() not in song_genre:
                penalty += 0.15
                
            # 5. Discovery / Novelty Score
            popularity = float(song.get("popularity", 50)) / 100.0
            novelty = (popularity - 0.5) * 0.05

            # 6. Language Preference Boost
            lang_boost = 0.0
            if preferred_languages:
                song_lang = str(song.get("language", "")).strip()
                if song_lang:
                    try:
                        priority_idx = [l.lower() for l in preferred_languages].index(song_lang.lower())
                        # First language = 0.25 boost, second = 0.15, third = 0.08, rest = 0.02
                        boosts = [0.25, 0.15, 0.08, 0.02]
                        lang_boost = boosts[priority_idx] if priority_idx < len(boosts) else 0.02
                    except ValueError:
                        lang_boost = -0.05  # Not in preferred list — slight penalty

            final_score = similarity + context + preference + novelty + lang_boost - penalty
            final_score = max(0.0, min(1.0, final_score))
            
            artist = song.get("artist", "Unknown")
            artist_counts[artist] = artist_counts.get(artist, 0) + 1
            
            s = song.copy()
            title_val = s.get("title") or s.get("name", "Unknown Title")
            s["title"] = title_val
            s["name"] = title_val
            s["language"] = s.get("language") or "English"
            s["source_provider"] = s.get("source_provider") or "YouTube"
            s["youtubeId"] = s.get("youtubeId") or TRACK_YOUTUBE_IDS.get(title_val.lower(), "4NRXx6U8ABQ")
            s["recommendation_score"] = round(final_score, 3)
            s["audio_features"] = feats
            
            # Explainable AI
            reasons = [f"{int(similarity*100)}% acoustic match"]
            if context > 0: reasons.append("fits context")
            if preference > 0: reasons.append("matches your taste")
            s["recommendation_reason"] = " · ".join(reasons)
            
            if min_score is not None and final_score < min_score:
                continue
                
            scored.append(s)
                
        # Sort descending by score
        scored.sort(key=lambda x: x["recommendation_score"], reverse=True)
        
        if limit < 0:
            final_results = scored
        else:
            final_results = scored[:limit]

        return normalized, final_results

    @classmethod
    def recommend_transition_journey(
        cls,
        start_emotion: str,
        target_emotion: str,
        steps: int = 4,
        user_genre: str | None = None
    ) -> list[dict[str, Any]]:
        norm_start = cls.normalize_emotion(start_emotion)
        norm_target = cls.normalize_emotion(target_emotion)

        start_profile = EMOTION_TARGETS.get(norm_start, EMOTION_TARGETS["neutral"])
        target_profile = EMOTION_TARGETS.get(norm_target, EMOTION_TARGETS["happy"])

        all_songs = [s for cat in SONGS.values() for s in cat]
        journey_songs = []
        used_titles = set()

        for step in range(steps):
            ratio = step / float(steps - 1) if steps > 1 else 1.0
            step_profile = {
                "valence": start_profile["valence"] * (1.0 - ratio) + target_profile["valence"] * ratio,
                "energy": start_profile["energy"] * (1.0 - ratio) + target_profile["energy"] * ratio,
                "tempo": start_profile["tempo"] * (1.0 - ratio) + target_profile["tempo"] * ratio,
            }

            best_song = None
            best_score = -1.0

            for song in all_songs:
                title_val = song.get("title") or song.get("name", "")
                if title_val in used_titles:
                    continue

                feats = cls.extract_song_features(song)
                sim = cls.compute_euclidean(feats, step_profile, DEFAULT_WEIGHTS)
                
                if user_genre and user_genre.lower() in str(song.get("genre", "")).lower():
                    sim += 0.1

                if sim > best_score:
                    best_score = sim
                    best_song = song

            if best_song:
                title_val = best_song.get("title") or best_song.get("name", "Unknown Title")
                used_titles.add(title_val)
                s = best_song.copy()
                s["title"] = title_val
                s["name"] = title_val
                s["youtubeId"] = s.get("youtubeId") or TRACK_YOUTUBE_IDS.get(title_val.lower(), "4NRXx6U8ABQ")
                s["recommendation_score"] = round(best_score, 3)
                s["recommendation_reason"] = f"Journey Step {step+1}/{steps} ({int(ratio*100)}% to {norm_target})"
                s["audio_features"] = cls.extract_song_features(best_song)
                journey_songs.append(s)

        return journey_songs

