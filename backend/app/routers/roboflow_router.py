"""Roboflow Integration API Router.

Includes endpoints for status, manual upload, dataset export, and the
automated 2-minute periodic batch synchronization and tracking engine.
"""

from typing import Any, Dict
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from backend.app.services.roboflow_bulk_service import bulk_sync_manager
from backend.app.services.roboflow_service import roboflow_service
from backend.app.services.roboflow_sync_service import sync_manager
from backend.db.database import get_db

router = APIRouter(prefix="/api/v1/roboflow", tags=["Roboflow Annotation Platform"])


@router.get("/status")
def get_roboflow_status() -> Dict[str, Any]:
    """Get current Roboflow integration status, configuration check, and deep link URL."""
    return roboflow_service.get_status()


@router.get("/sync/status")
def get_periodic_sync_status(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Get real-time countdown, pending queue count, and upload history from PostgreSQL."""
    return sync_manager.get_status(db)


@router.post("/sync/trigger")
async def trigger_periodic_sync_now(
    batch_size: int = Query(5, ge=1, le=20, description="Max images to send in this batch"),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Manually trigger the 2-minute batch sync cycle immediately."""
    return await sync_manager.execute_batch_sync(db, batch_limit=batch_size)


@router.get("/bulk/status")
def get_bulk_sync_status(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Get status and candidate count for bulk historical image uploads."""
    candidates = bulk_sync_manager.scan_historical_candidates(db)
    progress = bulk_sync_manager.get_progress()
    return {
        "pending_candidates": len(candidates),
        "job_progress": progress,
    }


@router.post("/bulk/start")
def start_bulk_sync_job(
    chunk_size: int = Query(300, ge=50, le=1000, description="Images per ZIP chunk"),
) -> Dict[str, Any]:
    """Start packaging and chunked uploading of historical legacy images."""
    started = bulk_sync_manager.start_job(chunk_size=chunk_size)
    if not started:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A bulk upload job is already in progress.",
        )
    return {"success": True, "message": "Bulk historical upload job started."}


@router.post("/bulk/cancel")
def cancel_bulk_sync_job() -> Dict[str, Any]:
    """Cancel the active bulk historical upload job."""
    cancelled = bulk_sync_manager.cancel_job()
    return {"success": cancelled, "message": "Bulk job cancelled." if cancelled else "No active bulk job to cancel."}


@router.post("/sync/seed")
def seed_pending_images_queue(
    limit: int = Query(60, ge=1, le=100),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Scan and register camera snapshot images into PostgreSQL with PENDING status."""
    count = sync_manager.scan_and_seed_pending_images(db, limit=limit)
    return {"success": True, "newly_seeded_count": count}


@router.post("/upload")
async def upload_image_to_roboflow(
    file: UploadFile = File(...),
    split: str = Query("train", description="Dataset split: train, valid, or test"),
) -> Dict[str, Any]:
    """Upload a single image directly to the configured Roboflow project."""
    contents = await file.read()
    result = await roboflow_service.upload_image(
        image_bytes=contents,
        filename=file.filename or "upload.jpg",
        split=split,
    )
    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("message") or result.get("error") or "Upload to Roboflow failed",
        )
    return result


@router.post("/sync-camera")
async def sync_camera_frames(
    sample_limit: int = Query(5, ge=1, le=20, description="Max number of recent frames to sync"),
) -> Dict[str, Any]:
    """Scan local camera ingestion directories and upload latest frames to Roboflow."""
    return await roboflow_service.sync_recent_camera_frames(sample_limit=sample_limit)


@router.post("/download-dataset")
async def download_dataset_export(
    version: int = Query(1, ge=1, description="Roboflow dataset version"),
    export_format: str = Query("yolov8", description="Export format (e.g. yolov8, coco, voc)"),
) -> Dict[str, Any]:
    """Request export download URL for a labeled dataset version from Roboflow."""
    result = await roboflow_service.download_dataset_export(
        version=version,
        export_format=export_format,
    )
    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.get("message") or result.get("error") or "Failed to retrieve dataset from Roboflow",
        )
    return result
