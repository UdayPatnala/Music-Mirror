import os
import time
from typing import Any, Dict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.db.database import get_db, DB_PATH
from app.db.models import Song, Artist, Album, SongSource, UserMusicPreference
from app.core.governance import GovernanceConfig, GovernanceAuditLog, circuit_breaker_manager
from app.services.catalog_reconciliation import CatalogReconciler

router = APIRouter()


@router.get("", status_code=200)
def health_check():
    """Simple Liveness Probe."""
    return {"status": "ok", "service": "MusicMirrorBackend", "version": "2.0.0"}


@router.get("/database", status_code=200)
def database_capacity_health(db: Session = Depends(get_db)):
    """Database Capacity, Latency, and Table Growth Metrics."""
    start_time = time.time()
    db.execute(text("SELECT 1")).fetchone()
    latency_ms = round((time.time() - start_time) * 1000, 2)

    db_size_bytes = os.path.getsize(DB_PATH) if os.path.exists(DB_PATH) else 0
    db_size_mb = round(db_size_bytes / (1024 * 1024), 2)
    capacity_threshold_pct = round((db_size_mb / 500.0) * 100, 2)

    return {
        "status": "healthy" if capacity_threshold_pct < 85 else "warning",
        "database": {
            "query_latency_ms": latency_ms,
            "database_size_mb": db_size_mb,
            "database_size_bytes": db_size_bytes,
        },
        "database_size_bytes": db_size_bytes,
        "database_size_mb": db_size_mb,
        "capacity_threshold_pct": capacity_threshold_pct,
        "query_latency_ms": latency_ms,
        "table_counts": {
            "songs": db.query(Song).count(),
            "artists": db.query(Artist).count(),
            "albums": db.query(Album).count(),
            "song_sources": db.query(SongSource).count(),
            "user_preferences": db.query(UserMusicPreference).count(),
        },
    }


@router.get("/governance", status_code=200)
def governance_and_recovery_health(db: Session = Depends(get_db)):
    """Exposes platform governance, circuit breakers, safe mode, and reconciliation health."""
    reconciliation = CatalogReconciler.run_reconciliation(db)

    return {
        "status": "SAFE_MODE" if GovernanceConfig.safe_mode_active else "OPERATIONAL",
        "governance_config": {
            "self_healing_enabled": GovernanceConfig.self_healing_enabled,
            "adaptive_recommendations_enabled": GovernanceConfig.adaptive_recommendations_enabled,
            "ai_enrichment_enabled": GovernanceConfig.ai_enrichment_enabled,
            "safe_mode_active": GovernanceConfig.safe_mode_active,
            "repair_circuit_breaker_active": GovernanceConfig.repair_circuit_breaker_active,
            "provider_circuit_breaker_active": GovernanceConfig.provider_circuit_breaker_active,
            "min_repair_confidence_threshold": GovernanceConfig.min_repair_confidence_threshold,
        },
        "catalog_reconciliation": reconciliation,
        "audit_log_records_count": len(GovernanceAuditLog.get_audit_records()),
    }
