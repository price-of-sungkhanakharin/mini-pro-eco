"""Parking analytics and Time-Series occupancy router."""

from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import desc
from sqlalchemy.orm import Session

from backend.app.models.parking_log import (
    ParkingOccupancyModel,
    ParkingTemplateModel,
    ParkStatusModel,
)
from backend.app.schemas.parking_schema import (
    CameraSettingsSchema,
    ParkingLocationSummary,
    ParkingLogCreate,
    ParkingLogResponse,
    ParkingSummaryResponse,
    ParkingTemplateResponse,
    ParkStatusResponse,
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


@router.get("/templates", response_model=List[ParkingTemplateResponse])
def get_parking_templates(
    camera_id: Optional[str] = Query(None, description="Optional filter by camera_id (e.g. cam1)"),
    db: Session = Depends(get_db),
):
    """Retrieve all or specific camera ROI parking templates from PostgreSQL."""
    query = db.query(ParkingTemplateModel).filter(ParkingTemplateModel.is_active.is_(True))
    if camera_id:
        query = query.filter(ParkingTemplateModel.camera_id == camera_id)
    return query.order_by(ParkingTemplateModel.camera_id).all()


@router.get("/queue", summary="Check Ingestion Queue & RAM Telemetry Buffer")
def get_ingestion_queue():
    """Retrieve current Redis Ingestion Queue length and RAM-buffered camera states."""
    import json
    import redis
    from backend.app.core.config import settings

    try:
        r_client = redis.Redis(
            host=settings.redis_host,
            port=settings.redis_port,
            db=0,
            decode_responses=True,
            socket_timeout=1.5,
        )
        queue_len = r_client.llen("camera:ingestion:queue")
        recent_items = []
        raw_items = r_client.lrange("camera:ingestion:queue", 0, 9)
        for it in raw_items:
            try:
                recent_items.append(json.loads(it))
            except Exception:
                pass

        cams_telemetry = {}
        for c in ["cam1", "cam2", "cam3"]:
            t_raw = r_client.get(f"camera:{c}:telemetry")
            if t_raw:
                try:
                    c_data = json.loads(t_raw)
                    cams_telemetry[c] = {
                        "online": r_client.get(f"camera:{c}:heartbeat") == "online",
                        "latest_frame": r_client.get(f"camera:{c}:latest_frame"),
                        "telemetry": c_data.get("telemetry", {}),
                        "timestamp": c_data.get("timestamp"),
                    }
                except Exception:
                    pass

        return {
            "status": "online",
            "queue_name": "camera:ingestion:queue",
            "pending_frames_in_queue": queue_len,
            "recent_queue_items": recent_items,
            "cameras_ram_state": cams_telemetry,
        }
    except Exception as e:
        return {"status": "error", "message": str(e), "pending_frames_in_queue": 0}


@router.get("/status", response_model=List[ParkStatusResponse])
def get_live_park_status(
    camera_id: Optional[str] = Query(None, description="Optional filter by camera_id (e.g. cam1)"),
    db: Session = Depends(get_db),
):
    """Retrieve real-time parking status for all or specific camera from Redis fast cache with PostgreSQL fallback."""
    import json
    import redis
    from backend.app.core.config import settings

    redis_data = {}
    try:
        r_client = redis.Redis(
            host=settings.redis_host,
            port=settings.redis_port,
            db=0,
            decode_responses=True,
            socket_timeout=1.5,
        )
        cams = [camera_id] if camera_id else ["cam1", "cam2", "cam3"]
        for c in cams:
            raw = r_client.get(f"parking:status:{c}")
            if raw:
                redis_data[c] = json.loads(raw)
    except Exception:
        pass

    # Fast path: If all requested cameras are present in Redis RAM, serve directly from RAM
    target_cams = [camera_id] if camera_id else ["cam1", "cam2", "cam3"]
    if all(c in redis_data for c in target_cams):
        results = []
        for c in target_cams:
            r = redis_data[c]
            up_dt = None
            if "updated_at" in r and isinstance(r["updated_at"], str):
                try:
                    up_dt = datetime.fromisoformat(r["updated_at"])
                except Exception:
                    pass
            results.append(ParkStatusResponse(
                id=None,
                camera_id=c,
                location_name=r.get("location_name", c.upper()),
                vehicle_type=r.get("vehicle_type", "car"),
                total_capacity=r.get("total_capacity", 0),
                occupied_count=r.get("occupied_count", 0),
                vacant_count=r.get("vacant_count", 0),
                occupancy_rate_pct=r.get("occupancy_rate_pct", 0.0),
                zone_pixel_occupancy_pct=r.get("zone_pixel_occupancy_pct"),
                status_level=r.get("status_level", "AVAILABLE"),
                car_capacity=r.get("car_capacity", 6 if c == "cam1" else (5 if c == "cam2" else 0)),
                car_occupied=r.get("car_occupied", 0),
                car_vacant=r.get("car_vacant", 0),
                bike_capacity=r.get("bike_capacity", 9 if c == "cam1" else (13 if c == "cam2" else 25)),
                bike_occupied=r.get("bike_occupied", 0),
                bike_vacant=r.get("bike_vacant", 0),
                available_slot_ids=r.get("available_slot_ids") or [],
                occupied_slot_ids=r.get("occupied_slot_ids") or [],
                slots_detail=r.get("slots_detail") or [],
                latest_image_url=r.get("latest_image_url"),
                updated_at=up_dt,
            ))
        return results

    query = db.query(ParkStatusModel)
    if camera_id:
        query = query.filter(ParkStatusModel.camera_id == camera_id)
    db_records = query.order_by(ParkStatusModel.camera_id).all()

    results = []
    for rec in db_records:
        r_info = redis_data.get(rec.camera_id, {})
        resp_item = ParkStatusResponse(
            id=rec.id,
            camera_id=rec.camera_id,
            location_name=rec.location_name,
            vehicle_type=rec.vehicle_type,
            total_capacity=r_info.get("total_capacity", rec.total_capacity),
            occupied_count=r_info.get("occupied_count", rec.occupied_count),
            vacant_count=r_info.get("vacant_count", rec.vacant_count),
            occupancy_rate_pct=r_info.get("occupancy_rate_pct", rec.occupancy_rate_pct),
            zone_pixel_occupancy_pct=rec.zone_pixel_occupancy_pct,
            status_level=r_info.get("status_level", rec.status_level),
            car_capacity=r_info.get("car_capacity", 6 if rec.camera_id == "cam1" else (5 if rec.camera_id == "cam2" else 0)),
            car_occupied=r_info.get("car_occupied", 0),
            car_vacant=r_info.get("car_vacant", 0),
            bike_capacity=r_info.get("bike_capacity", 9 if rec.camera_id == "cam1" else (13 if rec.camera_id == "cam2" else 25)),
            bike_occupied=r_info.get("bike_occupied", 0),
            bike_vacant=r_info.get("bike_vacant", 0),
            available_slot_ids=rec.available_slot_ids or [],
            occupied_slot_ids=rec.occupied_slot_ids or [],
            slots_detail=rec.slots_detail or [],
            latest_image_url=rec.latest_image_url,
            updated_at=rec.updated_at,
        )
        results.append(resp_item)

    return results


CONFIG_PATHS = [
    Path("/app/backend/config.json"),
    Path("/app/data/config.json"),
    Path("/home/r211admin/project-eco/ai-ecosystem-workspace/config.json"),
    Path("/home/r211admin/project-eco/ai-ecosystem-workspace/backend/config.json"),
    Path("/home/r211admin/project-eco/ai-ecosystem-workspace/data/config.json"),
    Path("/app/config.json"),
    Path("config.json"),
]


def _get_parking_config_path() -> Path:
    for p in CONFIG_PATHS:
        if p.exists():
            return p
    return CONFIG_PATHS[0]


@router.get("/settings", response_model=List[CameraSettingsSchema])
def get_camera_settings():
    """Retrieve camera hardware, quality, and framesize settings."""
    import json
    config_path = _get_parking_config_path()

    locations = {}
    if config_path.exists():
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                c_data = json.load(f)
                locations = c_data.get("locations", {})
        except Exception:
            pass

    results = []
    for loc_key, loc_val in locations.items():
        results.append(CameraSettingsSchema(
            camera_id=loc_val.get("camera_id", loc_key),
            name=loc_val.get("name"),
            brightness=float(loc_val.get("brightness", 1.0)),
            contrast=float(loc_val.get("contrast", 1.0)),
            rotation=int(loc_val.get("rotation", 0)),
            framesize=int(loc_val.get("framesize", 13)),
            quality=int(loc_val.get("quality", 10)),
            interval_sec=int(loc_val.get("interval_sec", 15)),
        ))
    return results


@router.post("/settings", response_model=CameraSettingsSchema)
def update_camera_settings(
    settings_payload: CameraSettingsSchema,
):
    """Update camera framesize, quality, and enhancement settings."""
    import json
    config_path = _get_parking_config_path()

    config_data = {}
    if config_path.exists():
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                config_data = json.load(f)
        except Exception:
            pass

    locations = config_data.get("locations", {})
    target_key = None
    for loc_key, loc_val in locations.items():
        if loc_val.get("camera_id") == settings_payload.camera_id or loc_key == settings_payload.camera_id:
            target_key = loc_key
            break

    if target_key:
        locations[target_key]["framesize"] = settings_payload.framesize
        locations[target_key]["quality"] = settings_payload.quality
        locations[target_key]["brightness"] = settings_payload.brightness
        locations[target_key]["contrast"] = settings_payload.contrast
        locations[target_key]["rotation"] = settings_payload.rotation
        locations[target_key]["interval_sec"] = settings_payload.interval_sec
        config_data["locations"] = locations
        for p in CONFIG_PATHS:
            if p.exists() or str(p).startswith("/home/r211admin") or str(p).startswith("/app/"):
                try:
                    with open(p, "w", encoding="utf-8") as f:
                        json.dump(config_data, f, indent=2, ensure_ascii=False)
                except Exception:
                    pass

    return settings_payload

