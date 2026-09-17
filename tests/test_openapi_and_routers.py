"""Unit tests for OpenAPI metadata and MinIO / Label Studio router integrations."""

from pathlib import Path
from fastapi.testclient import TestClient
from backend.main import app
from scripts.export_openapi_snapshot import export_openapi_snapshot

client = TestClient(app)


def test_openapi_schema_metadata():
    """Verify OpenAPI schema metadata structure."""
    schema = app.openapi()
    assert schema["info"]["title"] == "FastAPI AI Ecosystem Gateway API"
    assert schema["info"]["version"] == "1.0.0"
    assert "Central API Gateway" in schema["info"]["description"]
    assert schema["info"]["termsOfService"] == "http://example.com/terms/"
    assert schema["info"]["contact"]["name"] == "AIECO Dev Team"
    assert schema["info"]["license"]["name"] == "MIT License"
    
    tags = [t["name"] for t in schema.get("tags", [])]
    assert "System & Health" in tags
    assert "MinIO Storage" in tags
    assert "Label Studio" in tags
    assert "Authentication" in tags
    assert "Datasets" in tags
    assert "Model Registry" in tags
    assert "Async Training" in tags
    assert "Inference" in tags


def test_minio_router_health():
    """Test MinIO router health endpoint."""
    response = client.get("/api/v1/minio/health")
    # Endpoint exists and responds (may be 200 if minio running or 503 if not)
    assert response.status_code in [200, 503]


def test_label_studio_router_health():
    """Test Label Studio router health endpoint."""
    response = client.get("/api/v1/label-studio/health")
    # Endpoint exists and responds (may be 200 or 503 depending on server availability)
    assert response.status_code in [200, 503]


def test_export_snapshot_script():
    """Test executing export_openapi_snapshot function and verifying output files."""
    export_openapi_snapshot()
    root_dir = Path(__file__).resolve().parent.parent
    csv_file = root_dir / "openapi_snapshot.csv"
    excel_file = root_dir / "openapi_snapshot.xlsx"
    json_file = root_dir / "openapi.json"
    
    assert csv_file.exists()
    assert excel_file.exists()
    assert json_file.exists()
    assert csv_file.stat().st_size > 0
    assert excel_file.stat().st_size > 0
