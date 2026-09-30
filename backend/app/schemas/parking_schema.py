"""Pydantic schemas for parking occupancy time-series logging."""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class ParkingLogCreate(BaseModel):
    """Schema for creating a parking occupancy log record."""

    location_id: str
    vehicle_type: str = "car"
    detected_count: int
    capacity: int = 10
    image_path: Optional[str] = None
    raw_metadata: Optional[str] = None


class ParkingLogResponse(BaseModel):
    """Schema for parking occupancy log response."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    timestamp: datetime
    location_id: str
    vehicle_type: str
    detected_count: int
    capacity: int
    occupancy_pct: float
    status: str
    image_path: Optional[str] = None


class ParkingLocationSummary(BaseModel):
    """Real-time summary for a specific parking location."""

    location_id: str
    location_name: str
    vehicle_type: str
    detected_count: int
    capacity: int
    occupancy_pct: float
    status: str
    last_updated: Optional[datetime] = None


class ParkingSummaryResponse(BaseModel):
    """Ecosystem overview response for all camera locations."""

    total_locations: int
    total_vehicles: int
    overall_occupancy_pct: float
    locations: List[ParkingLocationSummary]
