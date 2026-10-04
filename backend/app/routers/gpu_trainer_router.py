"""Private GPU Compute Node Training API Router.

Includes endpoints for:
- Checking GPU Telemetry (NVIDIA GTX 1660 SUPER 6GB, VRAM, Temp)
- Starting training jobs with Pre-flight AST Syntax Checking (<5ms)
- Fetching live status and streaming logs via Server-Sent Events (SSE)
- Canceling jobs
- Listing available datasets
"""

import asyncio
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.core.security import get_optional_user
from backend.app.models.user import UserModel
from backend.app.services.gpu_node_client import gpu_node_client
from backend.app.services.gpu_training_manager import gpu_training_manager
from backend.db.database import get_db

router = APIRouter(prefix="/api/v1/training/gpu", tags=["Private GPU Compute Node"])


class StartGPUTrainRequest(BaseModel):
    model_name: Optional[str] = "YOLO26-Parking-v2"
    base_model: str = "yolo26m.pt"
    epochs: int = 50
    batch_size: int = 16
    imgsz: int = 640
    dataset_id: str = "ds_cctv_parking_labeled"
    roboflow_version: Optional[int] = 1
    gpu_type: str = "GTX 1660 SUPER (6GB)"
    custom_code: Optional[str] = None
    lr0: Optional[float] = 0.01
    optimizer: Optional[str] = "auto"
    mosaic: Optional[float] = 1.0
    mixup: Optional[float] = 0.15
    fliplr: Optional[float] = 0.5
    degrees: Optional[float] = 5.0
    hsv_v: Optional[float] = 0.4
    scale: Optional[float] = 0.3
    erasing: Optional[float] = 0.4
    patience: Optional[int] = 20


@router.post("/generate-code", summary="Generate YOLO Training Script Preview")
async def generate_code_preview(payload: StartGPUTrainRequest) -> Dict[str, Any]:
    """Generate YOLO Python training script from hyperparameters."""
    from backend.app.services.gpu_training_manager import generate_training_script
    code = generate_training_script(
        base_model=payload.base_model,
        epochs=payload.epochs,
        batch_size=payload.batch_size,
        imgsz=payload.imgsz,
        dataset_id=payload.dataset_id,
        lr0=payload.lr0 or 0.01,
        optimizer=payload.optimizer or "auto",
        mosaic=payload.mosaic if payload.mosaic is not None else 1.0,
        mixup=payload.mixup if payload.mixup is not None else 0.15,
        fliplr=payload.fliplr if payload.fliplr is not None else 0.5,
        degrees=payload.degrees if payload.degrees is not None else 5.0,
        hsv_v=payload.hsv_v if payload.hsv_v is not None else 0.4,
        scale=payload.scale if payload.scale is not None else 0.3,
        erasing=payload.erasing if payload.erasing is not None else 0.4,
        patience=payload.patience if payload.patience is not None else 20,
    )
    return {"code": code}


@router.get("/telemetry", summary="Get Remote GPU Telemetry")
async def get_gpu_telemetry() -> Dict[str, Any]:
    """Fetch live hardware telemetry (VRAM, temperature, status) from GPU Node."""
    return await gpu_node_client.get_gpu_telemetry()


@router.get("/datasets", summary="List Available Datasets")
async def list_training_datasets(db: Session = Depends(get_db)) -> List[Dict[str, Any]]:
    """List available datasets on GPU Node and Platform."""
    from backend.app.models.dataset import DatasetModel
    remote_datasets = await gpu_node_client.list_datasets()
    remote_ids = {d.get("dataset_id") for d in remote_datasets if "dataset_id" in d}
    
    db_datasets = db.query(DatasetModel).filter(DatasetModel.status.in_(["READY", "LABELED"])).all()
    results = []
    
    for d in remote_datasets:
        results.append({
            "dataset_id": d.get("dataset_id"),
            "name": d.get("name", d.get("dataset_id")),
            "size_mb": d.get("size_mb", 0.0),
            "file_count": d.get("file_count", 0),
            "is_cached": True,
            "status": "READY",
        })
        
    for ds in db_datasets:
        if ds.dataset_id not in remote_ids:
            results.append({
                "dataset_id": ds.dataset_id,
                "name": ds.name or ds.dataset_id,
                "size_mb": round((ds.file_size or 0) / (1024 * 1024), 2),
                "file_count": ds.images_count or 0,
                "is_cached": False,
                "status": ds.status,
            })
            
    return results



@router.post("/start", summary="Start Private GPU Node Training")
async def start_gpu_training(
    payload: StartGPUTrainRequest,
    current_user: Optional[UserModel] = Depends(get_optional_user),
) -> Dict[str, Any]:
    """Start YOLO training on Private GPU Compute Node with Pre-flight validation."""
    user_id = current_user.id if current_user else 1

    session, is_valid, syntax_error = gpu_training_manager.create_job(
        model_name=payload.model_name,
        base_model=payload.base_model,
        epochs=payload.epochs,
        batch_size=payload.batch_size,
        imgsz=payload.imgsz,
        dataset_id=payload.dataset_id,
        user_id=user_id,
        custom_code=payload.custom_code,
        lr0=payload.lr0 or 0.01,
        optimizer=payload.optimizer or "auto",
        mosaic=payload.mosaic if payload.mosaic is not None else 1.0,
        mixup=payload.mixup if payload.mixup is not None else 0.15,
        fliplr=payload.fliplr if payload.fliplr is not None else 0.5,
        degrees=payload.degrees if payload.degrees is not None else 5.0,
        hsv_v=payload.hsv_v if payload.hsv_v is not None else 0.4,
        scale=payload.scale if payload.scale is not None else 0.3,
        erasing=payload.erasing if payload.erasing is not None else 0.4,
        patience=payload.patience if payload.patience is not None else 20,
    )

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Pre-flight AST Syntax Check Failed: {syntax_error}",
        )

    # Launch background async training lifecycle
    asyncio.create_task(gpu_training_manager.run_training_lifecycle(session.job_id))

    return {
        "success": True,
        "message": "Training Job dispatched to Private GPU Node successfully",
        "job_id": session.job_id,
        "preflight_status": "PASSED (< 5ms AST Check)",
        "config": {
            "base_model": payload.base_model,
            "dataset_id": payload.dataset_id,
            "epochs": payload.epochs,
            "batch_size": payload.batch_size,
            "mode": "Advanced Custom Code" if payload.custom_code else "Easy UI Hyperparameters",
            "device": "NVIDIA GeForce GTX 1660 SUPER (6GB)",
        },
    }


@router.get("/status/{job_id}", summary="Get Training Job Status")
def get_job_status(job_id: str) -> Dict[str, Any]:
    """Retrieve detailed progress, metrics, and status for a training job."""
    session = gpu_training_manager.get_job(job_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Training job {job_id} not found",
        )
    return session.to_dict()


@router.get("/active", summary="Get Currently Active Training Job")
def get_active_training_job() -> Dict[str, Any]:
    """Get the currently running or most recent training session."""
    session = gpu_training_manager.get_active_job()
    if not session:
        return {"is_active": False, "job": None}
    return {"is_active": session.is_active, "job": session.to_dict()}


@router.get("/logs/{job_id}", summary="Stream Live Training Logs (SSE)")
async def stream_training_logs(job_id: str, request: Request):
    """Stream live terminal training logs via Server-Sent Events (SSE)."""
    session = gpu_training_manager.get_job(job_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Training job {job_id} not found",
        )

    async def event_generator():
        # Stream existing buffered logs
        for log in session.logs:
            yield f"data: {log}\n\n"

        # Stream new incoming logs
        while True:
            if await request.is_disconnected():
                break

            try:
                log_line = await asyncio.wait_for(session.log_queue.get(), timeout=2.0)
                yield f"data: {log_line}\n\n"
            except asyncio.TimeoutError:
                if session.status in ("COMPLETED", "FAILED", "CANCELLED"):
                    yield f"data: [INFO] Training session ended with status: {session.status}\n\n"
                    break
                yield f": heartbeat\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.post("/cancel/{job_id}", summary="Cancel GPU Training Job")
async def cancel_job(job_id: str) -> Dict[str, Any]:
    """Cancel an active training job on Private GPU Node."""
    session = gpu_training_manager.get_job(job_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Training job {job_id} not found",
        )
    session.is_active = False
    session.status = "CANCELLED"
    await gpu_node_client.cancel_job(job_id)
    return {"success": True, "message": f"Job {job_id} marked as cancelled"}
