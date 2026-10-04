"""Pydantic schemas for dataset storage management."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class DatasetResponse(BaseModel):
    """Schema for dataset response output."""

    id: int
    dataset_id: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    status: str = "RAW"
    filename: Optional[str] = ""
    minio_path: str
    raw_source_path: Optional[str] = None
    format: Optional[str] = "YOLOv11"
    images_count: Optional[int] = 0
    classes: Optional[Any] = None
    file_size: int = 0
    is_active: bool = True
    uploaded_by: Optional[int] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class DatasetConvertRequest(BaseModel):
    """Schema for converting raw data folder into labeled/ready YOLO dataset."""

    raw_path: str = Field(..., description="Source raw folder path in MinIO, e.g. raw-datasets/dataset/cam1")
    dataset_id: str = Field(..., description="Unique dataset identifier, e.g. ds_cctv_parking_v2")
    name: str = Field(..., description="Human-readable dataset name")
    description: Optional[str] = Field(None, description="Dataset description")
    classes: List[str] = Field(default=["car", "motorcycle"], description="Object detection classes")
    format: str = Field(default="YOLOv11", description="Dataset format")


class DatasetCreateRequest(BaseModel):
    """Schema for manual dataset creation or metadata registration."""

    dataset_id: str
    name: str
    description: Optional[str] = None
    minio_path: str
    format: str = "YOLOv11"
    images_count: int = 0
    classes: Optional[List[str]] = None
    status: str = "READY"

