"""Schemas for model inference."""

from typing import Any, Dict
from pydantic import BaseModel


class PredictRequest(BaseModel):
    """Inference request schema."""

    model_id: int
    input_data: Dict[str, Any]


class PredictResponse(BaseModel):
    """Inference response schema."""

    prediction: Dict[str, Any]
    confidence: float = 0.95
    model_version: str = "v1.0.0"
