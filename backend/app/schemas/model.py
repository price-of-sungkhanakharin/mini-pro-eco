"""Pydantic schemas for model registry management."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class ModelRegisterRequest(BaseModel):
    """Schema for registering a new machine learning model."""

    model_name: str
    version: str
    minio_weight_path: Optional[str] = None
    metrics: Optional[dict] = None


class ModelRegistryResponse(BaseModel):
    """Schema for model registry response output."""

    id: int
    model_name: str
    version: str
    minio_weight_path: str
    metrics: Optional[dict] = None
    created_by: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
