"""
User Interactions API (Blocks 05, 08, 13)
==========================================
POST /api/v2/user/interactions  - record play/skip/complete/like/dislike/replay
GET  /api/v2/user/interactions  - fetch interaction history for current user
DELETE /api/v2/user             - full GDPR-style account + data deletion
"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, validator
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import UserInteraction, UserMusicPreference
from app.core.auth import get_current_user, AuthenticatedUser
from app.services.interaction_service import InteractionService

router = APIRouter()

VALID_INTERACTION_TYPES = {"PLAY", "SKIP", "COMPLETE", "LIKE", "DISLIKE", "REPLAY", "ADD_TO_PLAYLIST"}


class RecordInteractionRequest(BaseModel):
    song_id: str = Field(..., min_length=1, max_length=36)
    interaction_type: str = Field(..., description="PLAY | SKIP | COMPLETE | LIKE | DISLIKE | REPLAY | ADD_TO_PLAYLIST")
    play_duration_seconds: Optional[int] = Field(None, ge=0, le=86400)
    song_duration_seconds: Optional[int] = Field(None, ge=0, le=86400)
    completion_ratio: Optional[float] = Field(None, ge=0.0, le=1.0)
    session_id: Optional[str] = Field(None, max_length=100)
    context_emotion: Optional[str] = Field(None, max_length=50)
    context_genre: Optional[str] = Field(None, max_length=100)

    @validator("interaction_type")
    def validate_type(cls, v):
        upper = v.upper().strip()
        if upper not in VALID_INTERACTION_TYPES:
            raise ValueError(f"interaction_type must be one of {sorted(VALID_INTERACTION_TYPES)}")
        return upper


@router.post("", summary="Record a user interaction (play/skip/like/dislike/complete/replay)")
async def record_interaction(
    body: RecordInteractionRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Records a user interaction. Events from private_session or do_not_learn users
    are stored but never used to update affinity scores.
    SKIP is NOT treated as DISLIKE — it has a much smaller negative signal.
    """
    # Check user privacy flags
    pref = db.query(UserMusicPreference).filter(UserMusicPreference.user_id == current_user.id).first()
    is_private = (pref.private_session if pref else False)

    result = InteractionService.record_interaction(
        db=db,
        user_id=current_user.id,
        song_id=body.song_id,
        interaction_type=body.interaction_type,
        play_duration_seconds=body.play_duration_seconds,
        song_duration_seconds=body.song_duration_seconds,
        completion_ratio=body.completion_ratio,
        session_id=body.session_id,
        context_emotion=body.context_emotion,
        context_genre=body.context_genre,
        is_private_session=is_private,
    )

    if result.get("status") == "error":
        raise HTTPException(status_code=400, detail=result["message"])

    return result


@router.get("", summary="Get recent interaction history for the current user")
async def get_interactions(
    limit: int = Query(50, ge=1, le=200),
    interaction_type: Optional[str] = Query(None),
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Returns paginated interaction history. Only the authenticated user's own data."""
    q = (
        db.query(UserInteraction)
        .filter(UserInteraction.user_id == current_user.id)
        .order_by(UserInteraction.created_at.desc())
    )
    if interaction_type:
        t = interaction_type.upper().strip()
        if t in VALID_INTERACTION_TYPES:
            q = q.filter(UserInteraction.interaction_type == t)

    interactions = q.limit(limit).all()
    return {
        "user_id": current_user.id,
        "count": len(interactions),
        "interactions": [
            {
                "id": i.id,
                "song_id": i.song_id,
                "interaction_type": i.interaction_type,
                "completion_ratio": i.completion_ratio,
                "is_private_session": i.is_private_session,
                "context_emotion": i.context_emotion,
                "context_genre": i.context_genre,
                "created_at": i.created_at.isoformat(),
            }
            for i in interactions
        ],
    }


@router.get("/affinity", summary="Get learned affinity scores for the current user")
async def get_affinity(
    entity_type: str = Query("GENRE", description="SONG | ARTIST | GENRE | MOOD | LANGUAGE"),
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Returns the learned affinity map for a given entity type. Values in [-1.0, 1.0]."""
    valid_types = {"SONG", "ARTIST", "GENRE", "MOOD", "LANGUAGE"}
    etype = entity_type.upper().strip()
    if etype not in valid_types:
        raise HTTPException(status_code=400, detail=f"entity_type must be one of {sorted(valid_types)}")

    pref = db.query(UserMusicPreference).filter(UserMusicPreference.user_id == current_user.id).first()
    profile_version = pref.profile_version if pref else 1

    affinity_map = InteractionService.get_user_affinity_map(db, current_user.id, etype, profile_version)
    return {
        "user_id": current_user.id,
        "entity_type": etype,
        "profile_version": profile_version,
        "affinities": affinity_map,
    }
