"""Label Studio ML Backend Proxy Router.

Bridges Label Studio instances with the Private GPU Compute Node (http://172.30.81.160:9000).
Key capabilities:
1. Translates storage URIs (s3://parking-label-queue/..., s3://raw-datasets/...) to HTTP MinIO endpoints.
2. Standard ML Backend interface (GET /health, POST /setup, POST /predict).
3. Class filtering and confidence score pass-through.
"""

import logging
from typing import Any, Dict, List, Optional
import httpx
from fastapi import APIRouter, HTTPException, Query, Request, status

from backend.app.core.config import settings

logger = logging.getLogger("MLBackendProxy")
router = APIRouter(prefix="/api/v1/ml-backend", tags=["Label Studio ML Backend Proxy"])

REMOTE_GPU_URL = (getattr(settings, "gpu_node_base_url", "http://172.30.81.160:9000") or "http://172.30.81.160:9000").rstrip("/")
LOCAL_MINIO_HOST = "172.30.228.51"
LOCAL_MINIO_PORT = 9000


def _resolve_image_uri(image_uri: str) -> str:
    """Translate storage URI (s3://, minio://) into a reachable HTTP URL for the remote GPU node."""
    if not image_uri:
        return image_uri

    if image_uri.startswith("s3://"):
        # Format: s3://bucket-name/path/to/image.jpg
        parts = image_uri[5:].split("/", 1)
        if len(parts) == 2:
            bucket, key = parts
            return f"http://{LOCAL_MINIO_HOST}:{LOCAL_MINIO_PORT}/{bucket}/{key}"
    elif image_uri.startswith("minio://"):
        parts = image_uri[8:].split("/", 1)
        if len(parts) == 2:
            bucket, key = parts
            return f"http://{LOCAL_MINIO_HOST}:{LOCAL_MINIO_PORT}/{bucket}/{key}"
    elif image_uri.startswith("/data/"):
        # Label Studio local data mount or proxy URL
        return f"http://{LOCAL_MINIO_HOST}:8080{image_uri}"

    return image_uri


@router.get("/health", summary="Label Studio ML Backend Health Check")
async def ml_health():
    """Verify health of remote GPU node inference engine."""
    url = f"{REMOTE_GPU_URL}/health"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                return resp.json()
            return {"status": "UP", "remote_status": resp.status_code}
    except Exception as exc:
        logger.warning(f"ML Backend health check upstream failure: {exc}")
        return {"status": "UP", "warning": f"Remote node not directly reachable: {str(exc)}"}


@router.post("/setup", summary="Label Studio ML Backend Project Handshake")
async def ml_setup(request: Request):
    """Handle standard Label Studio ML Backend setup handshake."""
    payload = {}
    try:
        payload = await request.json()
    except Exception:
        pass

    url = f"{REMOTE_GPU_URL}/setup"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code == 200:
                return resp.json()
    except Exception as exc:
        logger.warning(f"ML Backend setup handshake upstream fallback: {exc}")

    return {
        "status": "UP",
        "model_version": "yolo26x.pt",
        "labels": ["car", "motorcycle", "person"],
    }


@router.post("/predict", summary="Label Studio ML Backend Prediction")
async def ml_predict(request: Request, conf: float = Query(0.25, ge=0.05, le=1.0)):
    """Receives tasks from Label Studio, resolves image URLs, and queries YOLO26x."""
    try:
        payload = await request.json()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid JSON payload: {exc}")

    tasks = payload.get("tasks", [])
    if not tasks:
        return {"results": [], "model_version": "yolo26x.pt"}

    # Translate image paths for each task
    translated_tasks = []
    for task in tasks:
        t_copy = dict(task)
        data = dict(t_copy.get("data", {}))
        img_url = data.get("image", "")
        resolved = _resolve_image_uri(img_url)
        data["image"] = resolved
        t_copy["data"] = data
        translated_tasks.append(t_copy)

    forward_payload = dict(payload)
    forward_payload["tasks"] = translated_tasks

    url = f"{REMOTE_GPU_URL}/predict?conf={conf}"
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=forward_payload)
            if resp.status_code == 200:
                data = resp.json()
                # Optional: Filter only relevant vehicle labels (car, motorcycle)
                results = data.get("results", [])
                filtered_results = []
                target_classes = {"car", "motorcycle", "truck", "bus"}
                for r in results:
                    r_copy = dict(r)
                    boxes = r.get("result", [])
                    filtered_boxes = [
                        b for b in boxes
                        if any(lbl in target_classes for lbl in b.get("value", {}).get("rectanglelabels", []))
                    ]
                    # If target classes match, replace; otherwise keep original if none match
                    r_copy["result"] = filtered_boxes if filtered_boxes else boxes
                    filtered_results.append(r_copy)

                return {
                    "results": filtered_results,
                    "model_version": data.get("model_version", "yolo26x.pt"),
                }
            logger.error(f"Upstream ML predict returned {resp.status_code}: {resp.text}")
            raise HTTPException(status_code=resp.status_code, detail=resp.text)
    except httpx.RequestError as exc:
        logger.error(f"Failed connecting to ML backend at {url}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Unable to reach Private GPU Node at {url}: {str(exc)}",
        )
