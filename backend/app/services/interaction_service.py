"""
Interaction & Affinity Service (Blocks 01, 05, 08)
===================================================
Records user interactions (play/skip/complete/like/dislike/replay) and
updates bounded UserAffinity scores from verified outcomes only.

Signal weights (as per Block 05 specification):
  LIKE / REPLAY         → +0.25  (strong positive)
  COMPLETE              → +0.10  (medium positive, completion_ratio >= 0.80)
  ADD_TO_PLAYLIST       → +0.15  (medium positive)
  DISLIKE               → -0.30  (strong negative)
  SKIP (early, <30%)    → -0.10  (weak negative — SKIP != DISLIKE)
  SKIP (normal, >=30%)  → -0.03  (very weak negative)
  PLAY                  → +0.00  (neutral, just records the event)

Private session / do_not_learn interactions are stored but NEVER update affinity.
One interaction must not radically redefine taste (bounded per-event deltas).
"""
from __future__ import annotations

import math
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.db.models import (
    Song,
    UserInteraction,
    UserAffinity,
    UserMusicPreference,
)

# ── Signal weight table ───────────────────────────────────────────────────
INTERACTION_WEIGHTS: Dict[str, float] = {
    "LIKE": 0.25,
    "REPLAY": 0.25,
    "ADD_TO_PLAYLIST": 0.15,
    "COMPLETE": 0.10,       # only when completion_ratio >= 0.80
    "DISLIKE": -0.30,
    "SKIP_EARLY": -0.10,    # completion_ratio < 0.30
    "SKIP_NORMAL": -0.03,   # completion_ratio >= 0.30
    "PLAY": 0.00,           # neutral, records event only
}

POSITIVE_TYPES = {"LIKE", "REPLAY", "COMPLETE", "ADD_TO_PLAYLIST"}
NEGATIVE_TYPES = {"DISLIKE"}

# Affinity score boundaries — prevents runaway positive/negative drift
AFFINITY_MIN = -1.0
AFFINITY_MAX = 1.0


def _clamp(val: float, lo: float = AFFINITY_MIN, hi: float = AFFINITY_MAX) -> float:
    return max(lo, min(hi, val))


def _is_early_skip(interaction_type: str, completion_ratio: Optional[float]) -> bool:
    return interaction_type == "SKIP" and (completion_ratio or 0.0) < 0.30


def _resolve_signal(interaction_type: str, completion_ratio: Optional[float]) -> float:
    """Maps an interaction to its affinity delta, considering context."""
    t = interaction_type.upper()
    if t == "COMPLETE" and (completion_ratio or 0.0) < 0.80:
        return 0.03   # partial completion — very weak positive
    if t == "SKIP":
        return INTERACTION_WEIGHTS["SKIP_EARLY"] if _is_early_skip(t, completion_ratio) else INTERACTION_WEIGHTS["SKIP_NORMAL"]
    return INTERACTION_WEIGHTS.get(t, 0.0)


def _upsert_affinity(
    db: Session,
    user_id: str,
    entity_type: str,
    entity_id: str,
    delta: float,
    is_positive: bool,
    is_negative: bool,
    profile_version: int,
) -> None:
    """Atomically update or create a UserAffinity record."""
    affinity = (
        db.query(UserAffinity)
        .filter(
            UserAffinity.user_id == user_id,
            UserAffinity.entity_type == entity_type,
            UserAffinity.entity_id == entity_id,
        )
        .first()
    )
    if affinity is None:
        affinity = UserAffinity(
            user_id=user_id,
            entity_type=entity_type,
            entity_id=entity_id,
            affinity_score=0.0,
            interaction_count=0,
            positive_count=0,
            negative_count=0,
            profile_version=profile_version,
        )
        db.add(affinity)

    affinity.affinity_score = _clamp(affinity.affinity_score + delta)
    affinity.interaction_count += 1
    if is_positive:
        affinity.positive_count += 1
    if is_negative:
        affinity.negative_count += 1
    affinity.last_interaction_at = datetime.now(timezone.utc)
    affinity.profile_version = profile_version


class InteractionService:
    """
    Records user interactions and updates UserAffinity scores from verified outcomes.
    All updates respect: private_session, do_not_learn, profile_version.
    """

    @classmethod
    def record_interaction(
        cls,
        db: Session,
        user_id: str,
        song_id: str,
        interaction_type: str,
        play_duration_seconds: Optional[int] = None,
        song_duration_seconds: Optional[int] = None,
        completion_ratio: Optional[float] = None,
        session_id: Optional[str] = None,
        context_emotion: Optional[str] = None,
        context_genre: Optional[str] = None,
        is_private_session: bool = False,
    ) -> Dict[str, Any]:
        """
        Record an interaction event. Always stores the event record.
        Only updates affinity when NOT private_session and NOT do_not_learn.
        """
        itype = interaction_type.upper()
        valid_types = {"PLAY", "SKIP", "COMPLETE", "LIKE", "DISLIKE", "REPLAY", "ADD_TO_PLAYLIST"}
        if itype not in valid_types:
            return {"status": "error", "message": f"Invalid interaction_type '{itype}'. Valid: {sorted(valid_types)}"}

        song = db.query(Song).filter(Song.id == song_id).first()
        if not song:
            return {"status": "error", "message": "Song not found"}

        # Compute completion_ratio if not provided
        if completion_ratio is None and play_duration_seconds and song_duration_seconds and song_duration_seconds > 0:
            completion_ratio = round(min(1.0, play_duration_seconds / song_duration_seconds), 4)

        # Persist interaction record (always)
        interaction = UserInteraction(
            user_id=user_id,
            song_id=song_id,
            interaction_type=itype,
            play_duration_seconds=play_duration_seconds,
            song_duration_seconds=song_duration_seconds,
            completion_ratio=completion_ratio,
            session_id=session_id,
            is_private_session=is_private_session,
            context_emotion=context_emotion,
            context_genre=context_genre,
        )
        db.add(interaction)
        db.flush()

        affinity_updated = False
        if not is_private_session:
            pref = db.query(UserMusicPreference).filter(UserMusicPreference.user_id == user_id).first()
            do_not_learn = pref.do_not_learn if pref else False
            private_flag = (pref.private_session if pref else False) or is_private_session

            if not do_not_learn and not private_flag:
                cls._update_affinity(db, user_id, song, itype, completion_ratio, pref)
                affinity_updated = True

        db.commit()
        return {
            "status": "success",
            "interaction_id": interaction.id,
            "interaction_type": itype,
            "affinity_updated": affinity_updated,
        }

    @classmethod
    def _update_affinity(
        cls,
        db: Session,
        user_id: str,
        song: Song,
        itype: str,
        completion_ratio: Optional[float],
        pref: Optional[UserMusicPreference],
    ) -> None:
        """Update song, artist, genre, mood affinities from a single verified interaction."""
        delta = _resolve_signal(itype, completion_ratio)
        profile_version = pref.profile_version if pref else 1
        is_positive = itype in POSITIVE_TYPES
        is_negative = itype in NEGATIVE_TYPES

        # Song-level affinity
        _upsert_affinity(db, user_id, "SONG", song.id, delta, is_positive, is_negative, profile_version)

        # Artist-level affinity (derived from song)
        if song.artist_id:
            artist_name = song.artist.name if song.artist else song.artist_id
            _upsert_affinity(db, user_id, "ARTIST", artist_name.lower(), delta * 0.6, is_positive, is_negative, profile_version)

        # Genre-level affinity
        if song.genre:
            _upsert_affinity(db, user_id, "GENRE", song.genre.lower(), delta * 0.5, is_positive, is_negative, profile_version)

        # Mood-level affinity
        if song.mood:
            _upsert_affinity(db, user_id, "MOOD", song.mood.lower(), delta * 0.4, is_positive, is_negative, profile_version)

    @classmethod
    def get_user_affinity_map(
        cls,
        db: Session,
        user_id: str,
        entity_type: str,
        profile_version: int = 1,
    ) -> Dict[str, float]:
        """Returns {entity_id: affinity_score} for a given user + entity_type."""
        affinities = (
            db.query(UserAffinity)
            .filter(
                UserAffinity.user_id == user_id,
                UserAffinity.entity_type == entity_type,
                UserAffinity.profile_version == profile_version,
            )
            .all()
        )
        return {a.entity_id: a.affinity_score for a in affinities}

    @classmethod
    def get_recent_played_song_ids(
        cls,
        db: Session,
        user_id: str,
        limit: int = 20,
    ) -> List[str]:
        """Returns recently interacted song IDs for cooldown enforcement."""
        rows = (
            db.query(UserInteraction.song_id)
            .filter(
                UserInteraction.user_id == user_id,
                UserInteraction.interaction_type.in_(["PLAY", "COMPLETE", "LIKE"]),
                UserInteraction.is_private_session.is_(False),
            )
            .order_by(UserInteraction.created_at.desc())
            .limit(limit)
            .all()
        )
        return [r[0] for r in rows]

    @classmethod
    def reset_user_affinity(cls, db: Session, user_id: str) -> Dict[str, Any]:
        """Wipes all learned affinity for a user (called on profile reset / account deletion)."""
        deleted = db.query(UserAffinity).filter(UserAffinity.user_id == user_id).delete()
        db.commit()
        return {"status": "success", "deleted_affinity_records": deleted}

    @classmethod
    def delete_user_data(cls, db: Session, user_id: str) -> Dict[str, Any]:
        """Full GDPR-style deletion of all user-specific records."""
        interactions_deleted = db.query(UserInteraction).filter(UserInteraction.user_id == user_id).delete()
        affinities_deleted = db.query(UserAffinity).filter(UserAffinity.user_id == user_id).delete()
        prefs_deleted = db.query(UserMusicPreference).filter(UserMusicPreference.user_id == user_id).delete()
        from app.db.models import UserPlaybackReport
        reports_deleted = db.query(UserPlaybackReport).filter(UserPlaybackReport.user_id == user_id).delete()
        db.commit()
        return {
            "status": "success",
            "deleted": {
                "interactions": interactions_deleted,
                "affinities": affinities_deleted,
                "preferences": prefs_deleted,
                "reports": reports_deleted,
            },
        }
