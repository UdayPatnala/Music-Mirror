"""
Admin API (Block 15 — Safe Mode, Block 13 — Account Deletion)
==============================================================
POST /admin/safe-mode       — activate / deactivate system safe mode
DELETE /admin/user/{uid}    — admin-initiated account + data deletion
GET  /admin/repair-incidents — list persisted repair audit trail

These endpoints are intentionally kept separate from public user API.
In production these would be behind an additional admin auth layer.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import RepairIncident
from app.core.auth import get_current_user, AuthenticatedUser
from app.core.governance import GovernanceConfig
from app.services.interaction_service import InteractionService

router = APIRouter()


class SafeModeRequest(BaseModel):
    active: bool
    reason: Optional[str] = None


@router.post("/safe-mode", summary="Activate or deactivate system safe mode (Block 15)")
def toggle_safe_mode(
    body: SafeModeRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Toggles system safe mode (Block 15).
    When safe_mode_active=True: autonomous mutations stop, last-known-good data used,
    deterministic recommendations served, basic playback continues.
    When safe_mode_active=False: normal autonomous operation resumes.
    """
    previous = GovernanceConfig.safe_mode_active
    GovernanceConfig.safe_mode_active = body.active

    if body.active:
        # Also disable self-healing while in safe mode
        GovernanceConfig.self_healing_enabled = False
        GovernanceConfig.adaptive_recommendations_enabled = False
    else:
        # Restore normal operation
        GovernanceConfig.self_healing_enabled = True
        GovernanceConfig.adaptive_recommendations_enabled = True

    return {
        "status": "success",
        "safe_mode_active": GovernanceConfig.safe_mode_active,
        "previous_state": previous,
        "reason": body.reason,
        "changed_by": current_user.id,
        "changed_at": datetime.now(timezone.utc).isoformat(),
        "self_healing_enabled": GovernanceConfig.self_healing_enabled,
        "adaptive_recommendations_enabled": GovernanceConfig.adaptive_recommendations_enabled,
    }


@router.delete("/user/{target_user_id}", summary="Admin: full GDPR account deletion (Block 13)")
def admin_delete_user(
    target_user_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Full account + data deletion for a target user (Block 13 — Privacy).
    Removes: interactions, affinities, preferences, playback reports.
    Canonical music catalog is unaffected.
    """
    if not target_user_id.strip():
        raise HTTPException(status_code=400, detail="target_user_id must not be empty")

    result = InteractionService.delete_user_data(db, target_user_id.strip())
    return {
        "status": "success",
        "target_user_id": target_user_id,
        "initiated_by": current_user.id,
        "deleted_at": datetime.now(timezone.utc).isoformat(),
        "deleted": result.get("deleted", {}),
        "note": "Canonical music catalog records are unaffected.",
    }


@router.get("/repair-incidents", summary="List persisted repair audit trail (Block 10)")
def list_repair_incidents(
    limit: int = Query(50, ge=1, le=500),
    rolled_back_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Returns the durable repair audit trail from the database."""
    q = db.query(RepairIncident).order_by(RepairIncident.created_at.desc())
    if rolled_back_only:
        q = q.filter(RepairIncident.rolled_back.is_(True))
    incidents = q.limit(limit).all()

    return {
        "count": len(incidents),
        "incidents": [
            {
                "id": i.id,
                "incident_id": i.incident_id,
                "song_id": i.song_id,
                "classification": i.classification,
                "confidence": i.confidence,
                "canary_passed": i.canary_passed,
                "rolled_back": i.rolled_back,
                "trigger": i.trigger,
                "algorithm_version": i.algorithm_version,
                "created_at": i.created_at.isoformat(),
            }
            for i in incidents
        ],
    }
