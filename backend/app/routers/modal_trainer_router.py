"""Modal Cloud GPU Training API Router.

Includes endpoints for launching serverless GPU training jobs on Modal Labs,
fetching live status, streaming logs via Server-Sent Events (SSE), and canceling jobs.
"""

import asyncio
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.core.security import get_optional_user
from backend.app.models.user import UserModel
from backend.app.services.modal_training_manager import modal_training_manager
from backend.db.database import get_db

router = APIRouter(prefix="/api/v1/training/modal", tags=["Modal Cloud GPU Training"])


class StartModalTrainRequest(BaseModel):
    base_model: str = "yolov8n.pt"
    epochs: int = 50
    batch_size: int = 16
    imgsz: int = 640
    roboflow_version: int = 1
    gpu_type: str = "T4"  # T4, A10G, A100, L4


@router.post(
    "/start",
    summary="Start Modal Serverless GPU Training",
    description="Enqueue and launch YOLO training on Modal Cloud GPU using Roboflow dataset.",
)
async def start_modal_training(
    payload: StartModalTrainRequest,
    current_user: Optional[UserModel] = Depends(get_optional_user),
) -> Dict[str, Any]:
    """Start cloud GPU training job on Modal."""
    user_id = current_user.id if current_user else 1
    job = modal_training_manager.create_job(
        base_model=payload.base_model,
        epochs=payload.epochs,
        batch_size=payload.batch_size,
        imgsz=payload.imgsz,
        roboflow_version=payload.roboflow_version,
        gpu_type=payload.gpu_type,
        user_id=user_id,
    )

    # Launch background task
    asyncio.create_task(modal_training_manager.run_training_lifecycle(job.job_id))

    return {
        "success": True,
        "message": "Modal Cloud GPU Training Job launched successfully",
        "job_id": job.job_id,
        "config": {
            "base_model": payload.base_model,
            "epochs": payload.epochs,
            "roboflow_version": payload.roboflow_version,
            "gpu_type": payload.gpu_type,
        },
    }


@router.get(
    "/status/{job_id}",
    summary="Get Training Job Status & Metrics",
)
def get_job_status(job_id: str) -> Dict[str, Any]:
    """Retrieve detailed progress, metrics, and status for a training job."""
    job = modal_training_manager.get_job(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Training job {job_id} not found",
        )
    return job.to_dict()


@router.get(
    "/active",
    summary="Get Currently Active Training Job",
)
def get_active_training_job() -> Dict[str, Any]:
    """Get the currently running or most recent training session."""
    job = modal_training_manager.get_active_job()
    if not job:
        return {"is_active": False, "job": None}
    return {"is_active": job.is_active, "job": job.to_dict()}


@router.get(
    "/logs/{job_id}",
    summary="Stream Live Training Logs (SSE)",
)
async def stream_training_logs(job_id: str, request: Request):
    """Stream live terminal training logs via Server-Sent Events (SSE)."""
    job = modal_training_manager.get_job(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Training job {job_id} not found",
        )

    async def event_generator():
        # First send all existing buffered logs
        for log in job.logs:
            yield f"data: {log}\n\n"

        # Then stream new incoming logs
        while True:
            if await request.is_disconnected():
                break

            try:
                log_line = await asyncio.wait_for(job.log_queue.get(), timeout=2.0)
                yield f"data: {log_line}\n\n"
            except asyncio.TimeoutError:
                if job.status in ("COMPLETED", "FAILED", "CANCELLED"):
                    yield f"data: [INFO] Training session ended with status: {job.status}\n\n"
                    break
                # Keep-alive heartbeat
                yield f": heartbeat\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.post(
    "/cancel/{job_id}",
    summary="Cancel Modal Training Job",
)
def cancel_job(job_id: str) -> Dict[str, Any]:
    """Cancel an active training job."""
    job = modal_training_manager.get_job(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Training job {job_id} not found",
        )
    job.is_active = False
    job.status = "CANCELLED"
    return {"success": True, "message": f"Job {job_id} marked as cancelled"}
