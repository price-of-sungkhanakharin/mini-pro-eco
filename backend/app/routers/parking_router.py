"""Parking analytics and Time-Series occupancy router."""

from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc
from sqlalchemy.orm import Session

from backend.app.models.parking_log import ParkingOccupancyModel
from backend.app.schemas.parking_schema import (
    ParkingLocationSummary,
    ParkingLogCreate,
    ParkingLogResponse,
    ParkingSummaryResponse,
)
from backend.db.database import get_db

router = APIRouter(prefix="/api/v1/parking", tags=["Parking Analytics & Time-Series"])

LOCATION_METADATA = {
    "front_dept": {"name": "หน้าภาควิชา (Car)", "capacity": 10, "vehicle_type": "car"},
    "side_dept": {"name": "ข้างภาคคอมพิวเตอร์ (Motorcycle)", "capacity": 20, "vehicle_type": "motorcycle"},
}


@router.post("/logs", response_model=ParkingLogResponse, status_code=status.HTTP_201_CREATED)
def record_parking_log(
    payload: ParkingLogCreate,
    db: Session = Depends(get_db),
):
    """Record a new time-series parking detection observation from camera inference."""
    capacity = payload.capacity
    if payload.location_id in LOCATION_METADATA:
        capacity = LOCATION_METADATA[payload.location_id]["capacity"]

    occupancy_pct = round((payload.detected_count / max(capacity, 1)) * 100, 1)

    if occupancy_pct >= 90.0:
        occupancy_status = "FULL"
    elif occupancy_pct >= 60.0:
        occupancy_status = "MODERATE"
    else:
        occupancy_status = "AVAILABLE"

    log_entry = ParkingOccupancyModel(
        location_id=payload.location_id,
        vehicle_type=payload.vehicle_type,
        detected_count=payload.detected_count,
        capacity=capacity,
        occupancy_pct=occupancy_pct,
        status=occupancy_status,
        image_path=payload.image_path,
        raw_metadata=payload.raw_metadata,
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    return log_entry


@router.get("/latest", response_model=List[ParkingLogResponse])
def get_latest_logs(
    db: Session = Depends(get_db),
):
    """Retrieve the most recent observation for each active parking camera location."""
    results = []
    for loc_id in ["front_dept", "side_dept"]:
        latest = (
            db.query(ParkingOccupancyModel)
            .filter(ParkingOccupancyModel.location_id == loc_id)
            .order_by(desc(ParkingOccupancyModel.timestamp))
            .first()
        )
        if latest:
            results.append(latest)
    return results


@router.get("/summary", response_model=ParkingSummaryResponse)
def get_parking_summary(
    db: Session = Depends(get_db),
):
    """Retrieve an aggregated real-time summary across all camera locations."""
    locations_summary: List[ParkingLocationSummary] = []
    total_vehicles = 0
    total_capacity = 0

    for loc_id, meta in LOCATION_METADATA.items():
        latest = (
            db.query(ParkingOccupancyModel)
            .filter(ParkingOccupancyModel.location_id == loc_id)
            .order_by(desc(ParkingOccupancyModel.timestamp))
            .first()
        )

        detected_count = latest.detected_count if latest else 0
        capacity = meta["capacity"]
        occupancy_pct = round((detected_count / max(capacity, 1)) * 100, 1)
        loc_status = latest.status if latest else "NO_DATA"
        last_updated = latest.timestamp if latest else None

        total_vehicles += detected_count
        total_capacity += capacity

        locations_summary.append(
            ParkingLocationSummary(
                location_id=loc_id,
                location_name=meta["name"],
                vehicle_type=meta["vehicle_type"],
                detected_count=detected_count,
                capacity=capacity,
                occupancy_pct=occupancy_pct,
                status=loc_status,
                last_updated=last_updated,
            )
        )

    overall_pct = round((total_vehicles / max(total_capacity, 1)) * 100, 1)

    return ParkingSummaryResponse(
        total_locations=len(locations_summary),
        total_vehicles=total_vehicles,
        overall_occupancy_pct=overall_pct,
        locations=locations_summary,
    )


@router.get("/history", response_model=List[ParkingLogResponse])
def get_time_series_history(
    location_id: Optional[str] = Query(None, description="Filter by location_id (e.g. front_dept)"),
    hours: int = Query(24, ge=1, le=168, description="Number of past hours of history to fetch"),
    limit: int = Query(100, ge=1, le=500, description="Max number of records"),
    db: Session = Depends(get_db),
):
    """Fetch time-series logs for plotting graphs and trends (compatible with TimescaleDB / Grafana)."""
    cutoff_time = datetime.utcnow() - timedelta(hours=hours)
    query = db.query(ParkingOccupancyModel).filter(ParkingOccupancyModel.timestamp >= cutoff_time)

    if location_id:
        query = query.filter(ParkingOccupancyModel.location_id == location_id)

    records = query.order_by(desc(ParkingOccupancyModel.timestamp)).limit(limit).all()
    return records
