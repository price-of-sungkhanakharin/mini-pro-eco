"""Integration tests for Training router with delayed and scheduled jobs."""

from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.app.core.security import get_current_user
from backend.app.models.user import UserModel

# Mock current user to decouple router tests from database
mock_user = UserModel(
    id=1,
    email="test@example.com",
    hashed_password="hashed_test_password",
    role="user",
)
app.dependency_overrides[get_current_user] = lambda: mock_user

client = TestClient(app)


def test_train_job_immediate():
    """Test enqueueing immediate training job."""
    payload = {
        "dataset_id": 1,
        "model_name": "token_classification_v1",
        "hyperparameters": {"epochs": 2},
    }
    response = client.post("/api/v1/training/start", json=payload)
    assert response.status_code == 202
    data = response.json()
    assert "job_id" in data
    assert data["status"] == "queued"
    assert data["message"] == "Training job successfully enqueued"


def test_train_job_with_delay():
    """Test enqueueing training job with delay_seconds."""
    payload = {
        "dataset_id": 1,
        "model_name": "token_classification_v1",
        "delay_seconds": 15,
    }
    response = client.post("/api/v1/training/start", json=payload)
    assert response.status_code == 202
    data = response.json()
    assert "job_id" in data
    assert data["status"] == "queued"


def test_train_job_with_scheduled_time():
    """Test enqueueing training job with ISO timestamp scheduled_time."""
    from datetime import timedelta
    future_time = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()
    payload = {
        "dataset_id": 1,
        "model_name": "token_classification_v1",
        "scheduled_time": future_time,
    }
    response = client.post("/api/v1/training/start", json=payload)
    assert response.status_code == 202
    data = response.json()
    assert "job_id" in data
    assert data["status"] == "queued"


def test_train_job_status_endpoint():
    """Test status endpoint for enqueued job."""
    start_resp = client.post(
        "/api/v1/training/start",
        json={"dataset_id": 1, "model_name": "token_classification_v1"},
    )
    job_id = start_resp.json()["job_id"]

    status_resp = client.get(f"/api/v1/training/status/{job_id}")
    assert status_resp.status_code == 200
    data = status_resp.json()
    assert data["job_id"] == job_id
    assert "status" in data


def test_train_job_cancel_endpoint():
    """Test cancelling an enqueued training job."""
    start_resp = client.post(
        "/api/v1/training/start",
        json={"dataset_id": 1, "model_name": "token_classification_v1", "delay_seconds": 100},
    )
    job_id = start_resp.json()["job_id"]

    cancel_resp = client.post(f"/api/v1/training/cancel/{job_id}")
    assert cancel_resp.status_code == 200
    data = cancel_resp.json()
    assert data["job_id"] == job_id
    assert data["status"] == "cancelled"
