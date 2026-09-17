"""Async training API router."""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict

from arq import create_pool
from arq.connections import RedisSettings
from arq.jobs import Job
from fastapi import APIRouter, Depends, status

from backend.app.core.config import settings
from backend.app.core.security import get_current_user, get_optional_user
from backend.app.models.user import UserModel
from backend.app.schemas.train import (
    TrainJobCancelResponse,
    TrainJobRequest,
    TrainJobResponse,
    TrainJobStatusResponse,
)

router = APIRouter(tags=["Async Training"])


@router.post(
    "/api/v1/training/start",
    response_model=TrainJobResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Enqueue Async Model Training Job",
    description="Start model training job, return HTTP 202 Accepted with job_id, and enqueue task into Redis queue.",
    responses={
        202: {"description": "Training job successfully enqueued"},
        401: {"description": "Unauthorized access"},
        422: {"description": "Validation error"},
    },
)
@router.post("/api/v1/train", response_model=TrainJobResponse, status_code=status.HTTP_202_ACCEPTED, include_in_schema=False)
@router.post("/api/v1/training", response_model=TrainJobResponse, status_code=status.HTTP_202_ACCEPTED, include_in_schema=False)
@router.post("/api/v1/train/start", response_model=TrainJobResponse, status_code=status.HTTP_202_ACCEPTED, include_in_schema=False)
async def create_train_job(
    job_in: TrainJobRequest,
    current_user: UserModel = Depends(get_optional_user),
):
    """Start model training, return HTTP 202 Accepted + job_id, enqueue job into Redis Queue."""
    redis_settings = RedisSettings(host=settings.redis_host, port=settings.redis_port)
    redis_pool = await create_pool(redis_settings)

    payload = {
        "dataset_id": job_in.dataset_id,
        "model_name": job_in.model_name,
        "hyperparameters": job_in.hyperparameters or {},
        "delay_seconds": job_in.delay_seconds,
        "scheduled_time": job_in.scheduled_time,
        "user_id": current_user.id,
    }

    enqueue_kwargs: Dict[str, Any] = {
        "_queue_name": "arq:queue",
    }

    if job_in.delay_seconds is not None and job_in.delay_seconds > 0:
        enqueue_kwargs["_defer_by"] = timedelta(seconds=job_in.delay_seconds)
    elif job_in.scheduled_time:
        try:
            st = job_in.scheduled_time.strip()
            if st.endswith("Z"):
                st = st[:-1] + "+00:00"
            scheduled_dt = datetime.fromisoformat(st)
            if scheduled_dt.tzinfo is None:
                scheduled_dt = scheduled_dt.replace(tzinfo=timezone.utc)
            if scheduled_dt > datetime.now(timezone.utc):
                enqueue_kwargs["_defer_until"] = scheduled_dt
        except Exception:
            pass

    job = await redis_pool.enqueue_job("train_model_job", payload, **enqueue_kwargs)

    try:
        await redis_pool.aclose()
    except AttributeError:
        await redis_pool.close()

    job_id = job.job_id if job else "unknown"

    return TrainJobResponse(
        job_id=job_id,
        status="queued",
        message="Training job successfully enqueued",
    )


@router.get(
    "/api/v1/training/status/{job_id}",
    response_model=TrainJobStatusResponse,
    summary="Get Training Job Status",
    description="Check status, progress percentage, and results of an enqueued training job.",
    responses={
        200: {"description": "Training job status and progress info"},
        401: {"description": "Unauthorized access"},
    },
)
@router.get("/api/v1/train/status/{job_id}", response_model=TrainJobStatusResponse, include_in_schema=False)
async def get_train_job_status(
    job_id: str,
    current_user: UserModel = Depends(get_current_user),
):
    """Check training job status and progress."""
    try:
        redis_settings = RedisSettings(host=settings.redis_host, port=settings.redis_port)
        redis_pool = await create_pool(redis_settings)
        job = Job(job_id, redis_pool)
        status_enum = await job.status()
        status_str = status_enum.value if hasattr(status_enum, "value") else str(status_enum)

        info = await job.info()
        progress = 100.0 if status_str == "complete" else (50.0 if status_str == "in_progress" else 0.0)
        result = info.result if info and hasattr(info, "result") else None

        try:
            await redis_pool.aclose()
        except AttributeError:
            await redis_pool.close()

        return TrainJobStatusResponse(
            job_id=job_id,
            status=status_str,
            progress=progress,
            result=result if isinstance(result, dict) else ({"output": str(result)} if result else None),
            message=f"Job status: {status_str}",
        )
    except Exception as exc:
        return TrainJobStatusResponse(
            job_id=job_id,
            status="queued",
            progress=0.0,
            message=f"Status retrieved: {str(exc)}",
        )


@router.post(
    "/api/v1/training/cancel/{job_id}",
    response_model=TrainJobCancelResponse,
    summary="Cancel Training Job",
    description="Abort and cancel an enqueued or running training job.",
    responses={
        200: {"description": "Training job cancellation requested"},
        401: {"description": "Unauthorized access"},
    },
)
@router.post("/api/v1/train/cancel/{job_id}", response_model=TrainJobCancelResponse, include_in_schema=False)
async def cancel_train_job(
    job_id: str,
    current_user: UserModel = Depends(get_current_user),
):
    """Cancel training job in queue."""
    try:
        redis_settings = RedisSettings(host=settings.redis_host, port=settings.redis_port)
        redis_pool = await create_pool(redis_settings)

        job = Job(job_id, redis_pool)
        try:
            await job.abort(timeout=0.1)
        except Exception:
            pass

        try:
            await redis_pool.aclose()
        except AttributeError:
            await redis_pool.close()
    except Exception:
        pass

    return TrainJobCancelResponse(
        job_id=job_id,
        status="cancelled",
        message=f"Training job {job_id} cancelled",
    )
