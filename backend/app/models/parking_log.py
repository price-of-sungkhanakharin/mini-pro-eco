from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Float, Integer, String, Text, JSON

from backend.db.database import Base


class ParkingOccupancyModel(Base):
    """Parking occupancy time-series ORM model compatible with TimescaleDB / PostgreSQL."""

    __tablename__ = "parking_occupancy_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True, nullable=False)
    location_id = Column(String(50), index=True, nullable=False)
    vehicle_type = Column(String(30), default="car", nullable=False)
    detected_count = Column(Integer, default=0, nullable=False)
    capacity = Column(Integer, default=10, nullable=False)
    occupancy_pct = Column(Float, default=0.0, nullable=False)
    status = Column(String(20), default="AVAILABLE", nullable=False)
    image_path = Column(String(255), nullable=True)
    raw_metadata = Column(Text, nullable=True)


class ParkingTemplateModel(Base):
    """Parking ROI template and Zone polygon ORM model."""

    __tablename__ = "parking_templates"

    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(String(50), unique=True, index=True, nullable=False)
    location_name = Column(String(100), nullable=True)
    vehicle_type = Column(String(30), default="car", nullable=False)
    total_capacity = Column(Integer, default=0, nullable=False)
    zone_polygon = Column(JSON, nullable=True)
    slots = Column(JSON, default=list, nullable=False)
    frame_width = Column(Integer, default=1600, nullable=False)
    frame_height = Column(Integer, default=1200, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


class ParkStatusModel(Base):
    """Real-time parking status and analytics ORM model."""

    __tablename__ = "park_status"

    id = Column(Integer, primary_key=True, index=True)
    camera_id = Column(String(50), unique=True, index=True, nullable=False)
    location_name = Column(String(100), nullable=True)
    vehicle_type = Column(String(30), default="car", nullable=False)
    total_capacity = Column(Integer, default=0, nullable=False)
    occupied_count = Column(Integer, default=0, nullable=False)
    vacant_count = Column(Integer, default=0, nullable=False)
    occupancy_rate_pct = Column(Float, default=0.0, nullable=False)
    zone_pixel_occupancy_pct = Column(Float, default=0.0, nullable=False)
    status_level = Column(String(20), default="AVAILABLE", nullable=False)
    available_slot_ids = Column(JSON, default=list, nullable=False)
    occupied_slot_ids = Column(JSON, default=list, nullable=False)
    slots_detail = Column(JSON, default=list, nullable=False)
    latest_image_url = Column(String(255), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

