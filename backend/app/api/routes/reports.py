from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.database import get_db, Base
from app.core.auth import get_current_user, AuthenticatedUser
from app.core.rate_limiter import rate_limiter
from app.services.self_healing_engine import SelfHealingEngine

router = APIRouter()


class PlaybackReportPayload(BaseModel):
    song_id: str = Field(..., description="ID of the song encountering playback issues")
    source_id: Optional[str] = Field(None, description="Optional ID of the specific SongSource")
    report_type: str = Field(
        ...,
        description="Type of issue: 'NOT_PLAYING', 'WRONG_SONG', 'SOURCE_UNAVAILABLE', 'AUDIO_ERROR', 'WRONG_VERSION', 'OTHER'",
    )
    description: Optional[str] = Field(None, description="Optional free-text description")
    error_code: Optional[str] = Field(None, description="Optional player error code")


@router.post("", status_code=201)
def submit_playback_report(
    payload: PlaybackReportPayload,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # Enforce rate limiting to protect against report flooding
    rate_limiter.check_rate_limit(f"report_{current_user.id}")

    # Ensure tables exist
    Base.metadata.create_all(bind=db.get_bind())

    result = SelfHealingEngine.record_playback_report(
        db=db,
        user_id=current_user.id,
        song_id=payload.song_id,
        source_id=payload.source_id,
        report_type=payload.report_type,
        description=payload.description,
        error_code=payload.error_code,
    )

    if result.get("status") == "error":
        raise HTTPException(status_code=404, detail=result.get("message"))

    return {
        "status": "success",
        "message": "Playback problem report submitted successfully. Self-healing system initiated automated resolution.",
        "data": result,
    }
