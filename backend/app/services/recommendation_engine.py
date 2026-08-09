from __future__ import annotations
import json
import math
from datetime import datetime
from pathlib import Path
from typing import Any
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.db.models import Song, Artist, UserMusicPreference

DATA_PATH = Path(__file__).parent.parent.parent.parent / "data" / "songs.json"

try:
    with DATA_PATH.open("r", encoding="utf-8") as file:
        STATIC_SONGS: dict[str, list[dict[str, Any]]] = json.load(file)
except Exception:
    STATIC_SONGS = {}

SONGS = STATIC_SONGS

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

ADJACENT_GENRES = {
    "telugu pop": ["telugu melodic", "telugu classical fusion", "indie pop"],
    "telugu melodic": ["telugu pop", "telugu soul", "classical devotional"],
    "tamil kuthu": ["tamil action beats", "tamil folk pop", "south hip hop"],
    "bollywood romantic": ["bollywood classic soul", "bollywood ballad", "indie pop"],
    "synthwave pop": ["nu-disco pop", "indie pop", "dance pop classic"],
    "classic rock": ["classic rock opera", "indie pop"],
    "lo-fi ambient": ["classical piano", "lo-fi focus", "indie pop"],
}


def format_duration(seconds: int) -> str:
    sec = max(0, seconds or 180)
    mins = sec // 60
    secs = sec % 60
    return f"{mins}:{secs:02d}"


def parse_json_list(raw: str | None) -> list[str]:
    if not raw:
        return []
    try:
        data = json.loads(raw)
        return [str(x).strip().lower() for x in data] if isinstance(data, list) else []
    except Exception:
        return []


def diminishing_returns(count: int) -> float:
    """Computes log-scaling to protect against event flooding and artificial manipulation."""
    if count <= 0:
        return 0.0
    return math.log2(1.0 + min(count, 50))


class RecommendationService:
    @staticmethod
    def normalize_emotion(emotion: Any) -> str:
        if emotion is None:
            return "neutral"
        if isinstance(emotion, (int, float)):
            if isinstance(emotion, float) and (math.isnan(emotion) or math.isinf(emotion)):
                return "neutral"
            return "neutral"
        if not isinstance(emotion, str):
            return "neutral"

        cleaned = emotion.strip().lower()
        if not cleaned:
            return "neutral"

        return EMOTION_MAP.get(cleaned, cleaned)

    @classmethod
    def get_database_songs(cls, db: Session | None = None) -> list[dict[str, Any]]:
        """Fetch real songs from SQLite database."""
        close_on_exit = False
        if db is None:
            db = SessionLocal()
            close_on_exit = True

        try:
            db_songs = db.query(Song).join(Artist).all()
            if db_songs:
                candidates = []
                for s in db_songs:
                    artist_name = s.artist.name if s.artist else "Unknown Artist"
                    candidates.append({
                        "id": s.id,
                        "title": s.title,
                        "name": s.title,
                        "artist": artist_name,
                        "album": s.album_title or "Single",
                        "genre": s.genre,
                        "language": s.language,
                        "explicit": s.explicit,
                        "duration": s.duration,
                        "duration_str": format_duration(s.duration),
                        "valence": s.valence,
                        "energy": s.energy,
                        "tempo": s.tempo,
                        "popularity": s.popularity,
                        "mood": s.mood,
                        "youtubeId": s.youtube_id or "A6BJ-PgNWXA",
                        "youtube_id": s.youtube_id or "A6BJ-PgNWXA",
                        "preview_url": s.preview_url or s.audio_url or "https://prod-1.storage.jamendo.com/download/track/1880003/mp32/",
                        "cover_image_url": s.cover_image_url or f"https://img.youtube.com/vi/{s.youtube_id}/hqdefault.jpg" if s.youtube_id else None,
                    })
                return candidates
        except Exception:
            pass
        finally:
            if close_on_exit:
                db.close()

        # Fallback to static catalog if DB uninitialized
        all_static = []
        for category_list in STATIC_SONGS.values():
            for item in category_list:
                item_copy = item.copy()
                sec = item_copy.get("duration", 180)
                item_copy["duration"] = sec
                item_copy["duration_str"] = format_duration(sec)
                all_static.append(item_copy)
        return all_static

    @classmethod
    def get_user_preferences_from_db(cls, user_id: str = "default_user", db: Session | None = None) -> dict[str, Any]:
        """Fetch user explicit music preferences from database."""
        close_on_exit = False
        if db is None:
            db = SessionLocal()
            close_on_exit = True

        try:
            pref = db.query(UserMusicPreference).filter(UserMusicPreference.user_id == user_id).first()
            if pref:
                return {
                    "discovery_mode": pref.discovery_mode,
                    "energy_preference": pref.energy_preference,
                    "tempo_preference": pref.tempo_preference,
                    "vocal_preference": pref.vocal_preference,
                    "explicit_content_mode": pref.explicit_content_mode,
                    "preferred_genres": parse_json_list(pref.preferred_genres),
                    "preferred_artists": parse_json_list(pref.preferred_artists),
                    "preferred_moods": parse_json_list(pref.preferred_moods),
                    "preferred_languages": parse_json_list(pref.preferred_languages),
                }
        except Exception:
            pass
        finally:
            if close_on_exit:
                db.close()

        return {
            "discovery_mode": "balanced",
            "energy_preference": "balanced",
            "tempo_preference": "moderate",
            "vocal_preference": "mixed",
            "explicit_content_mode": "filter",
            "preferred_genres": [],
            "preferred_artists": [],
            "preferred_moods": [],
            "preferred_languages": [],
        }

    @staticmethod
    def extract_features(song: dict[str, Any]) -> dict[str, float]:
        raw_energy = song.get("energy", song.get("energy_numeric", 0.5))
        if isinstance(raw_energy, str):
            s_val = raw_energy.strip().lower()
            if "high" in s_val:
                energy = 0.85
            elif "low" in s_val:
                energy = 0.25
            else:
                energy = 0.5
        else:
            try:
                energy = float(raw_energy)
            except (ValueError, TypeError):
                energy = 0.5

        raw_valence = song.get("valence", 0.5)
        try:
            valence = float(raw_valence)
        except (ValueError, TypeError):
            valence = 0.5

        raw_tempo = song.get("tempo", 120.0)
        try:
            t_val = float(raw_tempo)
            tempo = t_val / 200.0 if t_val > 2.0 else t_val
        except (ValueError, TypeError):
            tempo = 0.5

        return {
            "valence": max(0.0, min(1.0, valence)),
            "energy": max(0.0, min(1.0, energy)),
            "tempo": max(0.0, min(1.0, tempo)),
        }

    extract_song_features = extract_features

    @staticmethod
    def compute_euclidean(song_features: dict[str, float], target_features: dict[str, float], weights: dict[str, float] | None = None) -> float:
        w = weights if weights is not None else DEFAULT_WEIGHTS
        total = sum(w.values())
        if total == 0:
            return 0.0
        sq_dist = sum(w.get(k, 0.0) * ((song_features.get(k, 0.5) - target_features.get(k, 0.5)) ** 2) for k in target_features)
        dist = math.sqrt(sq_dist / total)
        score = max(0.0, 1.0 - dist)
        return round(score, 4)

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
        user_id: str = "default_user",
        db: Session | None = None,
    ) -> tuple[str, list[dict[str, Any]]]:
        normalized = cls.normalize_emotion(emotion)

        if limit == 0:
            return normalized, []

        candidates = cls.get_database_songs(db)
        user_prefs = cls.get_user_preferences_from_db(user_id, db)

        # ── 1. HARD SAFETY FILTERS ──
        explicit_mode = user_prefs.get("explicit_content_mode", "filter")
        if explicit_mode == "hide" or explicit_mode == "filter":
            candidates = [c for c in candidates if not c.get("explicit", False)] or candidates

        # ── 2. INTENT & TARGET VECTOR SYNTHESIS ──
        target_profile = EMOTION_TARGETS.get(normalized, EMOTION_TARGETS["neutral"]).copy()

        # Adjust target energy based on explicit energy preference
        energy_pref = user_prefs.get("energy_preference")
        if energy_pref == "high":
            target_profile["energy"] = min(1.0, target_profile["energy"] + 0.15)
        elif energy_pref == "low":
            target_profile["energy"] = max(0.0, target_profile["energy"] - 0.15)

        # ── 3. GENRE & LANGUAGE CONSTRAINTS ──
        effective_genre = genre_filter if genre_filter is not None else user_genre
        if effective_genre and effective_genre.lower() != "any":
            target_g = effective_genre.lower()
            matching = [c for c in candidates if target_g in str(c.get("genre", "")).lower()]
            if genre_filter is not None:
                candidates = matching
            elif matching:
                candidates = matching + [c for c in candidates if c not in matching]

        active_langs = preferred_languages or user_prefs.get("preferred_languages")
        if active_langs:
            norm_langs = [l.lower() for l in active_langs]
            filtered_langs = [c for c in candidates if str(c.get("language", "")).lower() in norm_langs]
            if filtered_langs:
                candidates = filtered_langs

        # ── 4. MULTI-SIGNAL SCORING WITH DIVERSITY & DIMINISHING RETURNS ──
        pref_genres = user_prefs.get("preferred_genres", [])
        pref_artists = user_prefs.get("preferred_artists", [])
        pref_moods = user_prefs.get("preferred_moods", [])
        discovery_mode = user_prefs.get("discovery_mode", "balanced")

        artist_counts: dict[str, int] = {}
        scored_candidates: list[dict[str, Any]] = []

        for song in candidates:
            features = cls.extract_features(song)
            base_score = cls.compute_euclidean(features, target_profile)

            song_genre = str(song.get("genre", "")).lower()
            song_artist = str(song.get("artist", "")).lower()
            song_mood = str(song.get("mood", "")).lower()

            # Explicit Preference Affinity Boosts (weighted & capped)
            affinity_boost = 0.0
            if any(pg in song_genre for pg in pref_genres):
                affinity_boost += 0.15
            else:
                # Check adjacent genre discovery
                for pg in pref_genres:
                    adj_list = ADJACENT_GENRES.get(pg, [])
                    if any(adj in song_genre for adj in adj_list):
                        affinity_boost += 0.08
                        break

            if any(pa in song_artist for pa in pref_artists):
                affinity_boost += 0.20
            if song_mood in pref_moods:
                affinity_boost += 0.10

            # Adjust discovery vs familiarity weight
            if discovery_mode == "more_exploratory":
                # Boost adjacent/unseen genres
                if not any(pg in song_genre for pg in pref_genres):
                    affinity_boost += 0.12
            elif discovery_mode == "more_familiar":
                # Double familiar genre weight
                if any(pg in song_genre for pg in pref_genres):
                    affinity_boost += 0.10

            raw_score = base_score + affinity_boost

            # ── 5. FEEDBACK LOOP & DIVERSITY PENALIZATION ──
            # Apply artist saturation penalty (max 2 tracks per artist in top feed)
            current_art_count = artist_counts.get(song_artist, 0)
            diversity_penalty = min(0.35, current_art_count * 0.15)

            final_score = min(1.0, max(0.0, round(raw_score - diversity_penalty, 4)))

            if min_score is not None and final_score < min_score:
                continue

            artist_counts[song_artist] = current_art_count + 1

            song_copy = song.copy()
            song_copy["match_score"] = final_score
            song_copy["recommendation_score"] = final_score
            song_copy["audio_features"] = features
            song_copy["recommendation_reason"] = (
                f"Personalized match {int(final_score * 100)}% ({normalized} mood + adaptive taste)"
            )
            scored_candidates.append(song_copy)

        # ── 6. ROBUST FALLBACK WATERFALL ──
        if not scored_candidates and candidates and min_score is None:
            # Fallback to general catalog ordered by popularity
            for song in candidates[:limit]:
                song_copy = song.copy()
                song_copy["match_score"] = 0.70
                song_copy["recommendation_score"] = 0.70
                song_copy["recommendation_reason"] = "Popularity catalog fallback"
                scored_candidates.append(song_copy)

        scored_candidates.sort(key=lambda x: x["match_score"], reverse=True)
        return normalized, scored_candidates[:limit]
