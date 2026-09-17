"""System Health and Monitoring API router."""

import json
import os
import urllib.error
import urllib.request
from typing import Any, Dict, List, Optional

from arq import create_pool
from arq.connections import RedisSettings
from fastapi import APIRouter, Depends, Query
from sqlalchemy import text

from backend.app.core.config import settings
from backend.app.core.security import get_current_user
from backend.db.database import SessionLocal
from backend.app.models.user import UserModel
from backend.app.services.minio_service import MinIOService

router = APIRouter(tags=["System & Health"])


@router.get(
    "/api/v1/system/health",
    summary="System Health Diagnostics",
    description="Check operational health and connectivity status of PostgreSQL, MinIO, Redis, and Label Studio.",
    responses={
        200: {"description": "System services status report (healthy or degraded)"},
        500: {"description": "Internal error executing system health checks"},
    },
)
@router.get("/api/v1/health", include_in_schema=False)
@router.get("/health", include_in_schema=False)
async def check_health():
    """System health check for PostgreSQL, MinIO, Redis, Label Studio."""
    services = {}

    # Check PostgreSQL health
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        services["postgres"] = "healthy"
    except Exception as exc:
        services["postgres"] = f"unhealthy: {str(exc)}"

    # Check Redis health
    try:
        redis_settings = RedisSettings(host=settings.redis_host, port=settings.redis_port)
        redis_pool = await create_pool(redis_settings)
        await redis_pool.ping()
        try:
            await redis_pool.aclose()
        except AttributeError:
            await redis_pool.close()
        services["redis"] = "healthy"
    except Exception as exc:
        services["redis"] = f"unhealthy: {str(exc)}"

    # Check MinIO health
    try:
        minio_service = MinIOService()
        minio_service.client.list_buckets()
        services["minio"] = "healthy"
    except Exception as exc:
        services["minio"] = f"unhealthy: {str(exc)}"

    # Check Label Studio health
    try:
        base_url = getattr(settings, "label_studio_url", "http://localhost:8080").rstrip("/")
        health_url = f"{base_url}/health"
        try:
            req = urllib.request.Request(health_url, headers={"User-Agent": "BackendHealthCheck"})
            with urllib.request.urlopen(req, timeout=3) as resp:
                if resp.status == 200:
                    services["label_studio"] = "healthy"
                else:
                    services["label_studio"] = f"unhealthy: HTTP status {resp.status}"
        except urllib.error.HTTPError as exc:
            if exc.code in (200, 404):
                api_health_url = f"{base_url}/api/health"
                try:
                    req_api = urllib.request.Request(api_health_url, headers={"User-Agent": "BackendHealthCheck"})
                    with urllib.request.urlopen(req_api, timeout=3) as resp_api:
                        if resp_api.status == 200:
                            services["label_studio"] = "healthy"
                        else:
                            services["label_studio"] = f"unhealthy: HTTP status {resp_api.status}"
                except Exception:
                    services["label_studio"] = f"unhealthy: HTTP status {exc.code}"
            else:
                services["label_studio"] = f"unhealthy: HTTP status {exc.code}"
    except Exception as exc:
        services["label_studio"] = f"unhealthy: {str(exc)}"

    overall_status = "healthy" if all(val == "healthy" for val in services.values()) else "degraded"

    return {
        "status": overall_status,
        "services": services,
    }


@router.get(
    "/api/v1/system/logs",
    summary="Get System Logs",
    description="Retrieve structured JSON system logs history filtered by log level and quantity limit.",
    responses={
        200: {"description": "Structured JSON log entries retrieved successfully"},
        401: {"description": "Unauthorized access - valid bearer token required"},
    },
)
@router.get("/api/v1/logs", include_in_schema=False)
def get_system_logs(
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of log entries to return"),
    log_level: Optional[str] = Query(None, description="Filter logs by severity level (INFO, WARNING, ERROR, DEBUG)"),
    current_user: UserModel = Depends(get_current_user),
) -> List[Dict[str, Any]]:
    """Retrieve structured JSON logs history."""
    logs = []
    log_dir = "logs"

    log_files = [
        os.path.join(log_dir, "backend.log"),
        os.path.join(log_dir, "app.log"),
        os.path.join(log_dir, "backend.log.sample"),
        os.path.join(log_dir, "app.log.sample"),
    ]

    for log_file in log_files:
        if os.path.exists(log_file):
            try:
                with open(log_file, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if not line:
                            continue
                        try:
                            log_entry = json.loads(line)
                            if log_level:
                                entry_level = log_entry.get("log_level", "").upper()
                                if entry_level != log_level.upper():
                                    continue
                            logs.append(log_entry)
                        except json.JSONDecodeError:
                            continue
            except Exception:
                continue

    logs.reverse()
    return logs[:limit]
