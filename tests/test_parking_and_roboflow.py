"""Unit tests for Parking Time-Series analytics and Roboflow integration."""

from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_parking_log_lifecycle():
    """Test recording a parking occupancy log and retrieving latest and history."""
    # 1. Record log for front_dept (Car)
    payload_front = {
        "location_id": "front_dept",
        "vehicle_type": "car",
        "detected_count": 7,
        "capacity": 10,
        "image_path": "front_dept_sample.jpg",
    }
    res = client.post("/api/v1/parking/logs", json=payload_front)
    assert res.status_code == 201
    data = res.json()
    assert data["location_id"] == "front_dept"
    assert data["detected_count"] == 7
    assert data["occupancy_pct"] == 70.0
    assert data["status"] == "MODERATE"

    # 2. Record log for side_dept (Motorcycle)
    payload_side = {
        "location_id": "side_dept",
        "vehicle_type": "motorcycle",
        "detected_count": 19,
        "capacity": 20,
        "image_path": "side_dept_sample.jpg",
    }
    res = client.post("/api/v1/parking/logs", json=payload_side)
    assert res.status_code == 201
    data = res.json()
    assert data["location_id"] == "side_dept"
    assert data["detected_count"] == 19
    assert data["occupancy_pct"] == 95.0
    assert data["status"] == "FULL"

    # 3. Retrieve latest observations
    res_latest = client.get("/api/v1/parking/latest")
    assert res_latest.status_code == 200
    latest_items = res_latest.json()
    assert len(latest_items) >= 2
    loc_ids = [item["location_id"] for item in latest_items]
    assert "front_dept" in loc_ids
    assert "side_dept" in loc_ids

    # 4. Retrieve aggregated summary
    res_summary = client.get("/api/v1/parking/summary")
    assert res_summary.status_code == 200
    summary = res_summary.json()
    assert summary["total_locations"] == 2
    assert summary["total_vehicles"] >= 26

    # 5. Retrieve time-series history
    res_history = client.get("/api/v1/parking/history?location_id=front_dept&hours=24")
    assert res_history.status_code == 200
    history = res_history.json()
    assert len(history) >= 1
    assert history[0]["location_id"] == "front_dept"


def test_roboflow_status_and_validation():
    """Test Roboflow status response structure."""
    res = client.get("/api/v1/roboflow/status")
    assert res.status_code == 200
    status_data = res.json()
    assert "configured" in status_data
    assert "project_url" in status_data
    assert "message" in status_data
