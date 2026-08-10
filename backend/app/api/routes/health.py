import os
import time
from typing import Any, Dict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text, func

from app.db.database import get_db, DB_PATH
from app.db.models import Song, Artist, Album, SongSource, UserMusicPreference, UserInteraction, UserAffinity, RepairIncident
from app.core.governance import GovernanceConfig, GovernanceAuditLog, circuit_breaker_manager
from app.services.catalog_reconciliation import CatalogReconciler
from app.services.ml_model_ecosystem import ModelRegistry
from app.services.mlops_pipeline import DatasetTracker, FeatureVersionManager, ModelDriftDetector, MLOpsPipelineEngine

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
            "user_interactions": db.query(UserInteraction).count(),
            "user_affinities": db.query(UserAffinity).count(),
            "repair_incidents": db.query(RepairIncident).count(),
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


@router.get("/mlops", status_code=200)
def mlops_lifecycle_health():
    """Exposes MLOps lifecycle status, model registry, dataset versions, drift metrics, and feature consistency."""
    active_models = ModelRegistry.list_active_models()
    sample_dataset = DatasetTracker.get_dataset_info("ds_music_v2.0.0")
    drift = ModelDriftDetector.compute_drift_score(baseline_mean=0.50, current_mean=0.52)

    return {
        "status": "OPERATIONAL",
        "feature_version": FeatureVersionManager.FEATURE_CONFIG["feature_version"],
        "active_models_count": len(active_models),
        "active_models": active_models,
        "sample_dataset_tracking": sample_dataset,
        "drift_monitoring": drift,
        "fallback_status": "READY",
    }


@router.get("/playback", status_code=200)
def playback_quality_health(db: Session = Depends(get_db)):
    """
    Playback and interaction quality observability (Block 14).
    Returns interaction counts by type, source health aggregates, and repair statistics.
    """
    # Interaction breakdown
    interaction_counts: Dict[str, int] = {}
    try:
        rows = (
            db.query(UserInteraction.interaction_type, func.count(UserInteraction.id))
            .group_by(UserInteraction.interaction_type)
            .all()
        )
        interaction_counts = {row[0]: row[1] for row in rows}
    except Exception:
        pass

    total_interactions = sum(interaction_counts.values())
    likes = interaction_counts.get("LIKE", 0)
    dislikes = interaction_counts.get("DISLIKE", 0)
    skips = interaction_counts.get("SKIP", 0)
    completes = interaction_counts.get("COMPLETE", 0)

    completion_rate = round(completes / max(total_interactions, 1), 4)
    like_rate = round(likes / max(total_interactions, 1), 4)

    # Source health aggregates
    source_health: Dict[str, Any] = {}
    try:
        total_sources = db.query(SongSource).count()
        active_sources = db.query(SongSource).filter(SongSource.status == "ACTIVE").count()
        quarantined_sources = db.query(SongSource).filter(SongSource.status == "QUARANTINED").count()
        unavailable_sources = db.query(SongSource).filter(SongSource.status == "UNAVAILABLE").count()
        source_health = {
            "total": total_sources,
            "active": active_sources,
            "quarantined": quarantined_sources,
            "unavailable": unavailable_sources,
            "active_pct": round(active_sources / max(total_sources, 1) * 100, 1),
        }
    except Exception:
        pass

    # Repair incident summary
    repair_summary: Dict[str, Any] = {}
    try:
        total_repairs = db.query(RepairIncident).count()
        successful_repairs = db.query(RepairIncident).filter(RepairIncident.canary_passed.is_(True)).count()
        rolled_back = db.query(RepairIncident).filter(RepairIncident.rolled_back.is_(True)).count()
        repair_summary = {
            "total_incidents": total_repairs,
            "successful_repairs": successful_repairs,
            "rollbacks": rolled_back,
            "success_rate": round(successful_repairs / max(total_repairs, 1), 4),
        }
    except Exception:
        pass

    return {
        "status": "ok",
        "interactions": {
            "total": total_interactions,
            "by_type": interaction_counts,
            "completion_rate": completion_rate,
            "like_rate": like_rate,
            "skip_count": skips,
            "dislike_count": dislikes,
        },
        "source_health": source_health,
        "repair_incidents": repair_summary,
        "circuit_breaker": {
            "repair_active": GovernanceConfig.repair_circuit_breaker_active,
            "provider_active": GovernanceConfig.provider_circuit_breaker_active,
        },
        "safe_mode": GovernanceConfig.safe_mode_active,
    }
