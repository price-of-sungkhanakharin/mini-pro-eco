"""ParkingOccupancyModel definition for Time-Series parking analytics."""

from datetime import datetime
from sqlalchemy import Column, DateTime, Float, Integer, String, Text

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
