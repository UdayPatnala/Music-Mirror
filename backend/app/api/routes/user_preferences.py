import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db, Base
from app.db.models import UserMusicPreference
from app.schemas.user_preference import UserMusicPreferenceDTO, UpdateUserMusicPreferencePayload
from app.core.auth import get_current_user, AuthenticatedUser

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
    cleaned = sorted(list(set([str(x).strip() for x in items if str(x).strip()])))
    return json.dumps(cleaned)


def get_user_preference_model(db: Session, user_id: str) -> UserMusicPreference:
    # Ensure tables are created on whatever connection engine is bound to db
    Base.metadata.create_all(bind=db.get_bind())

    pref = db.query(UserMusicPreference).filter(UserMusicPreference.user_id == user_id).first()
    if not pref:
        pref = UserMusicPreference(
            user_id=user_id,
            profile_version=1,
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
        db.flush()
    return pref


def to_dto(pref: UserMusicPreference) -> UserMusicPreferenceDTO:
    return UserMusicPreferenceDTO(
        user_id=pref.user_id,
        profile_version=pref.profile_version or 1,
        discovery_mode=pref.discovery_mode,
        energy_preference=pref.energy_preference,
        tempo_preference=pref.tempo_preference,
        vocal_preference=pref.vocal_preference,
        explicit_content_mode=pref.explicit_content_mode,
        preferred_genres=parse_json_list(pref.preferred_genres),
        preferred_artists=parse_json_list(pref.preferred_artists),
        preferred_moods=parse_json_list(pref.preferred_moods),
        preferred_languages=parse_json_list(pref.preferred_languages),
        blocked_artists=parse_json_list(pref.blocked_artists),
        blocked_songs=parse_json_list(pref.blocked_songs),
    )


@router.get("/export")
def export_user_data(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pref = get_user_preference_model(db, current_user.id)
    return {
        "status": "success",
        "exported_at": "2026-08-09T19:29:00Z",
        "user_id": current_user.id,
        "profile": to_dto(pref).model_dump(),
        "disclaimer": "This export contains your personal profile data and preferences.",
    }


@router.get("", response_model=UserMusicPreferenceDTO)
def get_user_preferences(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pref = get_user_preference_model(db, current_user.id)
    db.commit()
    return to_dto(pref)


@router.put("", response_model=UserMusicPreferenceDTO)
def update_user_preferences(
    payload: UpdateUserMusicPreferencePayload,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pref = get_user_preference_model(db, current_user.id)

    modified = False
    if payload.discovery_mode is not None and payload.discovery_mode in ["more_familiar", "balanced", "more_exploratory"]:
        pref.discovery_mode = payload.discovery_mode
        modified = True
    if payload.energy_preference is not None and payload.energy_preference in ["low", "balanced", "high"]:
        pref.energy_preference = payload.energy_preference
        modified = True
    if payload.tempo_preference is not None and payload.tempo_preference in ["slow", "moderate", "fast"]:
        pref.tempo_preference = payload.tempo_preference
        modified = True
    if payload.vocal_preference is not None and payload.vocal_preference in ["vocal", "mixed", "instrumental"]:
        pref.vocal_preference = payload.vocal_preference
        modified = True
    if payload.explicit_content_mode is not None and payload.explicit_content_mode in ["allow", "filter", "hide"]:
        pref.explicit_content_mode = payload.explicit_content_mode
        modified = True

    if payload.preferred_genres is not None:
        pref.preferred_genres = serialize_json_list(payload.preferred_genres)
        modified = True
    if payload.preferred_artists is not None:
        pref.preferred_artists = serialize_json_list(payload.preferred_artists)
        modified = True
    if payload.preferred_moods is not None:
        pref.preferred_moods = serialize_json_list(payload.preferred_moods)
        modified = True
    if payload.preferred_languages is not None:
        pref.preferred_languages = serialize_json_list(payload.preferred_languages)
        modified = True

    if payload.blocked_artists is not None:
        pref.blocked_artists = serialize_json_list(payload.blocked_artists)
        modified = True
    if payload.blocked_songs is not None:
        pref.blocked_songs = serialize_json_list(payload.blocked_songs)
        modified = True

    if modified:
        pref.profile_version = (pref.profile_version or 1) + 1

    db.commit()
    return to_dto(pref)


@router.post("/reset", response_model=UserMusicPreferenceDTO)
def reset_user_preferences(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    pref = get_user_preference_model(db, current_user.id)
    pref.profile_version = (pref.profile_version or 1) + 1
    pref.discovery_mode = "balanced"
    pref.energy_preference = "balanced"
    pref.tempo_preference = "moderate"
    pref.vocal_preference = "mixed"
    pref.explicit_content_mode = "filter"
    pref.preferred_genres = serialize_json_list(["Pop"])
    pref.preferred_artists = serialize_json_list([])
    pref.preferred_moods = serialize_json_list(["happy"])
    pref.preferred_languages = serialize_json_list(["Telugu", "English"])
    pref.blocked_artists = serialize_json_list([])
    pref.blocked_songs = serialize_json_list([])

    db.commit()
    return to_dto(pref)


@router.delete("/account")
def delete_user_account(
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from app.db.backup import DatabaseBackupManager
    summary = DatabaseBackupManager.delete_user_account_data(db, current_user.id)
    return {
        "status": "success",
        "message": f"Account data for user '{current_user.id}' successfully removed/anonymized.",
        "summary": summary,
    }
