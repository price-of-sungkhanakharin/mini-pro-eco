"""Pydantic schemas for dataset storage management."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class DatasetResponse(BaseModel):
    """Schema for dataset response output."""

    id: int
    filename: str
    minio_path: str
    file_size: int
    uploaded_by: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
