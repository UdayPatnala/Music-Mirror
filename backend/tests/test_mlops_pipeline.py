import pytest
from fastapi.testclient import TestClient

from app.services.mlops_pipeline import DatasetTracker, FeatureVersionManager, ModelDriftDetector, MLOpsPipelineEngine
from app.main import app


@pytest.fixture(scope="function")
def client():
    with TestClient(app) as c:
        yield c


# ── 1. DATASET TRACKING & LINEAGE TEST ────────────────────────────────────
def test_dataset_tracking_and_lineage():
    dataset_info = DatasetTracker.get_dataset_info("ds_music_v2.0.0")
    assert dataset_info is not None
    assert dataset_info["dataset_version"] == "v2.0.0"
    assert dataset_info["quality_metrics"]["data_integrity_passed"] is True

    # Register new dataset version
    new_ds = DatasetTracker.register_dataset("ds_music_v2.1.0", "v2.1.0", 150, {"null_count": 0, "data_integrity_passed": True})
    assert new_ds["dataset_version"] == "v2.1.0"
    assert new_ds["row_count"] == 150


# ── 2. FEATURE VERSION VALIDATION TEST ────────────────────────────────────
def test_feature_version_validation():
    valid_vec = [0.5, 0.6, 0.7, 0.8, 0.9, 0.4]
    invalid_dim = [0.5, 0.6]
    nan_vec = [0.5, float("nan"), 0.7, 0.8, 0.9, 0.4]

    ok, msg = FeatureVersionManager.validate_feature_vector(valid_vec)
    assert ok is True

    ok_dim, msg_dim = FeatureVersionManager.validate_feature_vector(invalid_dim)
    assert ok_dim is False

    ok_nan, msg_nan = FeatureVersionManager.validate_feature_vector(nan_vec)
    assert ok_nan is False


# ── 3. MODEL DRIFT DETECTION TEST ─────────────────────────────────────────
def test_model_drift_detection():
    # Normal variation (no drift)
    no_drift = ModelDriftDetector.compute_drift_score(baseline_mean=0.50, current_mean=0.52)
    assert no_drift["data_drift_detected"] is False
    assert no_drift["action_required"] == "MONITOR"

    # Significant variation (drift detected)
    has_drift = ModelDriftDetector.compute_drift_score(baseline_mean=0.50, current_mean=0.80)
    assert has_drift["data_drift_detected"] is True
    assert has_drift["action_required"] == "RETRAIN_MODEL"


# ── 4. OFFLINE EVALUATION & ROLLBACK TEST ─────────────────────────────────
def test_mlops_offline_evaluation_and_rollback():
    eval_res = MLOpsPipelineEngine.evaluate_model_offline("audio_embedding_v1", precision=0.82, recall=0.79, ndcg=0.85)
    assert eval_res["passed_offline_gate"] is True

    rollback = MLOpsPipelineEngine.trigger_model_rollback("experimental_v2", "Precision dropped below 0.60 threshold")
    assert rollback["status"] == "ROLLED_BACK"
    assert rollback["restored_model_id"] == "audio_embedding_v1"


# ── 5. GET /health/mlops ENDPOINT TEST ────────────────────────────────────
def test_mlops_health_endpoint(client):
    response = client.get("/health/mlops")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "OPERATIONAL"
    assert "active_models" in data
    assert "drift_monitoring" in data
    assert "sample_dataset_tracking" in data
