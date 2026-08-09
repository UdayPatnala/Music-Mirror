import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional


class GovernanceConfig:
    """Central Feature Flags & Emergency Stop System."""

    self_healing_enabled: bool = True
    adaptive_recommendations_enabled: bool = True
    ai_enrichment_enabled: bool = True
    safe_mode_active: bool = False
    repair_circuit_breaker_active: bool = False
    provider_circuit_breaker_active: bool = False

    min_repair_confidence_threshold: float = 0.60
    max_repair_attempts_per_incident: int = 3
    canary_verification_required: bool = True


class CircuitBreakerManager:
    """
    Monitors self-healing & provider failure rates.
    Triggers circuit breakers to prevent infinite retry loops or request storms.
    """

    def __init__(self):
        self._repair_failures: List[datetime] = []
        self._provider_failures: List[datetime] = []
        self._window_seconds: int = 600 # 10 minute window
        self._failure_threshold: int = 5

    def record_repair_failure(self) -> bool:
        """Records a repair failure. Returns True if circuit breaker was triggered."""
        now = datetime.now(timezone.utc)
        self._repair_failures.append(now)
        self._clean_old_failures()

        if len(self._repair_failures) >= self._failure_threshold:
            GovernanceConfig.repair_circuit_breaker_active = True
            return True
        return False

    def record_provider_failure(self) -> bool:
        """Records a provider network failure. Returns True if circuit breaker was triggered."""
        now = datetime.now(timezone.utc)
        self._provider_failures.append(now)
        self._clean_old_failures()

        if len(self._provider_failures) >= self._failure_threshold:
            GovernanceConfig.provider_circuit_breaker_active = True
            return True
        return False

    def _clean_old_failures(self):
        cutoff = datetime.now(timezone.utc) - timedelta(seconds=self._window_seconds)
        self._repair_failures = [t for t in self._repair_failures if t > cutoff]
        self._provider_failures = [t for t in self._provider_failures if t > cutoff]

    def reset_circuit_breakers(self):
        self._repair_failures.clear()
        self._provider_failures.clear()
        GovernanceConfig.repair_circuit_breaker_active = False
        GovernanceConfig.provider_circuit_breaker_active = False


circuit_breaker_manager = CircuitBreakerManager()


class GovernanceAuditLog:
    """In-memory & database traceable audit log of automated repairs & rollbacks."""

    _audit_records: List[Dict[str, Any]] = []

    @classmethod
    def log_repair_action(
        cls,
        incident_id: str,
        song_id: str,
        old_source_id: Optional[str],
        new_source_id: str,
        reason: str,
        confidence: float,
        verification_result: str,
        canary_passed: bool,
    ):
        record = {
            "incident_id": incident_id,
            "song_id": song_id,
            "old_source_id": old_source_id,
            "new_source_id": new_source_id,
            "reason": reason,
            "confidence": confidence,
            "verification_result": verification_result,
            "canary_passed": canary_passed,
            "algorithm_version": "v2.0.0-governed",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "rolled_back": False,
        }
        cls._audit_records.append(record)
        return record

    @classmethod
    def get_audit_records(cls) -> List[Dict[str, Any]]:
        return cls._audit_records
