import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import UserMusicPreference, Artist, Song
from app.schemas.user_preference import UserMusicPreferenceDTO, UpdateUserMusicPreferencePayload

router = APIRouter()


def parse_json_list(raw: str | None) -> List[str]:
    if not raw:
        return []
    try:
        data = json.loads(raw)
        return data if isinstance(data, list) else []
    except Exception:
        return []


def serialize_json_list(items: List[str] | None) -> str:
    if not items:
        return "[]"
    # Deduplicate and trim items
    cleaned = sorted(list(set([str(x).strip() for x in items if str(x).strip()])))
    return json.dumps(cleaned)


def get_user_preference_model(db: Session, user_id: str) -> UserMusicPreference:
    try:
        pref = db.query(UserMusicPreference).filter(UserMusicPreference.user_id == user_id).first()
    except Exception:
        from app.db.database import Base
        Base.metadata.create_all(bind=db.get_bind())
        pref = db.query(UserMusicPreference).filter(UserMusicPreference.user_id == user_id).first()

    if not pref:
        pref = UserMusicPreference(
            user_id=user_id,
            discovery_mode="balanced",
            energy_preference="balanced",
            tempo_preference="moderate",
            vocal_preference="mixed",
            explicit_content_mode="filter",
            preferred_genres=json.dumps(["Telugu Pop", "Pop"]),
            preferred_artists=json.dumps(["Sid Sriram", "Anirudh Ravichander"]),
            preferred_moods=json.dumps(["happy", "romantic"]),
            preferred_languages=json.dumps(["Telugu", "English"]),
        )
        db.add(pref)
        db.commit()
        db.refresh(pref)
    return pref


def to_dto(pref: UserMusicPreference) -> UserMusicPreferenceDTO:
    return UserMusicPreferenceDTO(
        user_id=pref.user_id,
        discovery_mode=pref.discovery_mode,
        energy_preference=pref.energy_preference,
        tempo_preference=pref.tempo_preference,
        vocal_preference=pref.vocal_preference,
        explicit_content_mode=pref.explicit_content_mode,
        preferred_genres=parse_json_list(pref.preferred_genres),
        preferred_artists=parse_json_list(pref.preferred_artists),
        preferred_moods=parse_json_list(pref.preferred_moods),
        preferred_languages=parse_json_list(pref.preferred_languages),
    )


@router.get("", response_model=UserMusicPreferenceDTO)
def get_user_preferences(
    x_user_id: str = Header("default_user", alias="X-User-ID"),
    db: Session = Depends(get_db),
):
    pref = get_user_preference_model(db, x_user_id)
    return to_dto(pref)


@router.put("", response_model=UserMusicPreferenceDTO)
def update_user_preferences(
    payload: UpdateUserMusicPreferencePayload,
    x_user_id: str = Header("default_user", alias="X-User-ID"),
    db: Session = Depends(get_db),
):
    pref = get_user_preference_model(db, x_user_id)

    if payload.discovery_mode is not None:
        if payload.discovery_mode in ["more_familiar", "balanced", "more_exploratory"]:
            pref.discovery_mode = payload.discovery_mode
    if payload.energy_preference is not None:
        if payload.energy_preference in ["low", "balanced", "high"]:
            pref.energy_preference = payload.energy_preference
    if payload.tempo_preference is not None:
        if payload.tempo_preference in ["slow", "moderate", "fast"]:
            pref.tempo_preference = payload.tempo_preference
    if payload.vocal_preference is not None:
        if payload.vocal_preference in ["vocal", "mixed", "instrumental"]:
            pref.vocal_preference = payload.vocal_preference
    if payload.explicit_content_mode is not None:
        if payload.explicit_content_mode in ["allow", "filter", "hide"]:
            pref.explicit_content_mode = payload.explicit_content_mode

    if payload.preferred_genres is not None:
        pref.preferred_genres = serialize_json_list(payload.preferred_genres)
    if payload.preferred_artists is not None:
        pref.preferred_artists = serialize_json_list(payload.preferred_artists)
    if payload.preferred_moods is not None:
        pref.preferred_moods = serialize_json_list(payload.preferred_moods)
    if payload.preferred_languages is not None:
        pref.preferred_languages = serialize_json_list(payload.preferred_languages)

    db.commit()
    db.refresh(pref)
    return to_dto(pref)


@router.post("/reset", response_model=UserMusicPreferenceDTO)
def reset_user_preferences(
    x_user_id: str = Header("default_user", alias="X-User-ID"),
    db: Session = Depends(get_db),
):
    pref = get_user_preference_model(db, x_user_id)
    pref.discovery_mode = "balanced"
    pref.energy_preference = "balanced"
    pref.tempo_preference = "moderate"
    pref.vocal_preference = "mixed"
    pref.explicit_content_mode = "filter"
    pref.preferred_genres = serialize_json_list(["Pop"])
    pref.preferred_artists = serialize_json_list([])
    pref.preferred_moods = serialize_json_list(["happy"])
    pref.preferred_languages = serialize_json_list(["Telugu", "English"])

    db.commit()
    db.refresh(pref)
    return to_dto(pref)
