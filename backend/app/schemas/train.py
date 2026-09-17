"""Schemas for training jobs."""

from typing import Any, Dict, Optional
from pydantic import BaseModel


class TrainJobRequest(BaseModel):
    """Training job request schema."""

    dataset_id: int
    model_name: str
    hyperparameters: Optional[Dict[str, Any]] = None
    delay_seconds: Optional[int] = None
    scheduled_time: Optional[str] = None


class TrainJobResponse(BaseModel):
    """Training job response schema."""

    job_id: str
    status: str = "queued"
    message: str


class TrainJobStatusResponse(BaseModel):
    """Training job status check response schema."""

    job_id: str
    status: str
    progress: float = 0.0
    result: Optional[Dict[str, Any]] = None
    message: Optional[str] = None


class TrainJobCancelResponse(BaseModel):
    """Training job cancellation response schema."""

    job_id: str
    status: str = "cancelled"
    message: str
