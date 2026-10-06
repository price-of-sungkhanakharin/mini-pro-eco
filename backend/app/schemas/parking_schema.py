"""Pydantic schemas for parking occupancy time-series logging."""

from datetime import datetime
from typing import Any, List, Optional
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


class ParkingTemplateResponse(BaseModel):
    """Schema for parking template response."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    camera_id: str
    location_name: Optional[str] = None
    vehicle_type: str = "car"
    total_capacity: int = 0
    zone_polygon: Optional[List[Any]] = None
    slots: List[Any] = []
    frame_width: int = 1600
    frame_height: int = 1200
    framesize: int = 13
    quality: int = 10
    is_active: bool = True
    updated_at: Optional[datetime] = None


class CameraSettingsSchema(BaseModel):
    """Schema for camera image, quality, and framesize settings."""

    camera_id: str
    name: Optional[str] = None
    brightness: float = 1.0
    contrast: float = 1.0
    rotation: int = 0
    framesize: int = 9
    quality: int = 10
    interval_sec: int = 20
    deep_sleep_sec: int = 20
    deep_sleep_sec_day: int = 20
    deep_sleep_sec_night: int = 1800


class ParkStatusResponse(BaseModel):
    """Schema for real-time park status response."""

    model_config = ConfigDict(from_attributes=True)

    id: Optional[int] = None
    camera_id: str
    location_name: Optional[str] = None
    vehicle_type: str = "car"
    total_capacity: int = 0
    occupied_count: int = 0
    vacant_count: int = 0
    occupancy_rate_pct: float = 0.0
    zone_pixel_occupancy_pct: float = 0.0
    status_level: str = "AVAILABLE"
    car_capacity: Optional[int] = None
    car_occupied: Optional[int] = None
    car_vacant: Optional[int] = None
    bike_capacity: Optional[int] = None
    bike_occupied: Optional[int] = None
    bike_vacant: Optional[int] = None
    available_slot_ids: List[Any] = []
    occupied_slot_ids: List[Any] = []
    slots_detail: List[Any] = []
    latest_image_url: Optional[str] = None
    updated_at: Optional[datetime] = None
