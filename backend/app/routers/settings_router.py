"""Router for Camera and System Settings."""

import json
from pathlib import Path
from typing import List
from fastapi import APIRouter

from backend.app.schemas.parking_schema import CameraSettingsSchema

router = APIRouter(prefix="/api/v1/settings", tags=["Camera & System Settings"])

CONFIG_PATHS = [
    Path("/app/backend/config.json"),
    Path("/app/data/config.json"),
    Path("/home/r211admin/project-eco/ai-ecosystem-workspace/config.json"),
    Path("/home/r211admin/project-eco/ai-ecosystem-workspace/backend/config.json"),
    Path("/home/r211admin/project-eco/ai-ecosystem-workspace/data/config.json"),
    Path("/app/config.json"),
    Path("config.json"),
]


def _get_config_path() -> Path:
    for p in CONFIG_PATHS:
        if p.exists():
            return p
    return CONFIG_PATHS[0]


@router.get("", response_model=List[CameraSettingsSchema])
@router.get("/", response_model=List[CameraSettingsSchema])
def get_camera_settings():
    """Retrieve camera hardware, quality, and framesize settings."""
    config_path = _get_config_path()
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
            framesize=int(loc_val.get("framesize", 9)),
            quality=int(loc_val.get("quality", 10)),
            interval_sec=int(loc_val.get("interval_sec", 20)),
            deep_sleep_sec=int(loc_val.get("deep_sleep_sec", 20)),
            deep_sleep_sec_day=int(loc_val.get("deep_sleep_sec_day", loc_val.get("deep_sleep_sec", 20))),
            deep_sleep_sec_night=int(loc_val.get("deep_sleep_sec_night", 1800)),
            day_sleep_mode=str(loc_val.get("day_sleep_mode", "model")),
        ))
    return results


@router.post("", response_model=CameraSettingsSchema)
@router.post("/", response_model=CameraSettingsSchema)
def update_camera_settings(settings_payload: CameraSettingsSchema):
    """Update camera framesize, quality, deep sleep, and enhancement settings."""
    config_path = _get_config_path()
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
        locations[target_key]["deep_sleep_sec"] = settings_payload.deep_sleep_sec
        locations[target_key]["deep_sleep_sec_day"] = settings_payload.deep_sleep_sec_day
        locations[target_key]["deep_sleep_sec_night"] = settings_payload.deep_sleep_sec_night
        if settings_payload.day_sleep_mode:
            locations[target_key]["day_sleep_mode"] = settings_payload.day_sleep_mode
        config_data["locations"] = locations
        for p in CONFIG_PATHS:
            if p.exists() or str(p).startswith("/home/r211admin") or str(p).startswith("/app/"):
                try:
                    with open(p, "w", encoding="utf-8") as f:
                        json.dump(config_data, f, indent=2, ensure_ascii=False)
                except Exception:
                    pass

    return settings_payload
