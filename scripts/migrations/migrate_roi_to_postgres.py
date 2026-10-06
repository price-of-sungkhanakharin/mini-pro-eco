"""Migration script to transfer ROI templates and initial park_status to PostgreSQL."""

import json
import logging
from pathlib import Path
import psycopg2
from psycopg2.extras import Json

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("ROI_Migrator")

BASE_DIR = Path(__file__).resolve().parent.parent.parent
ROI_FILE = BASE_DIR / "data" / "roi.json"

DATABASES = [
    {
        "dbname": "drsum_parking",
        "user": "parking_user",
        "password": "parkingpass123",
        "host": "localhost",
        "port": 5432,
    },
    {
        "dbname": "ai_ecosystem",
        "user": "postgres",
        "password": "postgres",
        "host": "localhost",
        "port": 5432,
    },
]


def migrate():
    if not ROI_FILE.exists():
        logger.warning(f"File {ROI_FILE} not found. Skipping migration.")
        return

    with open(ROI_FILE, "r", encoding="utf-8") as f:
        roi_data = json.load(f)

    for db_cfg in DATABASES:
        try:
            conn = psycopg2.connect(**db_cfg)
            cur = conn.cursor()

            for cam_key, data in roi_data.items():
                if cam_key.startswith("_") or not isinstance(data, dict):
                    continue

                cam_id = data.get("camera_id", cam_key)
                name = data.get("name", f"Camera {cam_id}")
                capacity = int(data.get("capacity", len(data.get("slots", []))))
                vehicle_type = "motorcycle" if "bike" in name.lower() or "มอเตอร์ไซค์" in name or cam_id == "cam3" else "car"
                polygon = data.get("zones") if data.get("zones") is not None else data.get("polygon", [])
                slots = []

                # Upsert into parking_templates
                cur.execute(
                    """
                    INSERT INTO parking_templates (
                        camera_id, location_name, vehicle_type, total_capacity,
                        zone_polygon, slots, frame_width, frame_height, is_active, created_at, updated_at
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, 1600, 1200, TRUE, NOW(), NOW())
                    ON CONFLICT (camera_id) DO UPDATE SET
                        location_name = EXCLUDED.location_name,
                        vehicle_type = EXCLUDED.vehicle_type,
                        total_capacity = EXCLUDED.total_capacity,
                        zone_polygon = EXCLUDED.zone_polygon,
                        slots = EXCLUDED.slots,
                        frame_width = EXCLUDED.frame_width,
                        frame_height = EXCLUDED.frame_height,
                        is_active = EXCLUDED.is_active,
                        updated_at = NOW();
                    """,
                    (cam_id, name, vehicle_type, capacity, Json(polygon), Json(slots)),
                )

                # Initialize park_status if not exists
                occupied_slots = [s["id"] for s in slots if s.get("occupied")]
                available_slots = [s["id"] for s in slots if not s.get("occupied")]
                occupied_count = len(occupied_slots)
                vacant_count = len(available_slots)
                total_slots = len(slots) if len(slots) > 0 else max(capacity, 1)
                occupancy_pct = round((occupied_count / max(total_slots, 1)) * 100, 1)
                status_level = "FULL" if occupancy_pct >= 90 else "MODERATE" if occupancy_pct >= 60 else "AVAILABLE"

                cur.execute(
                    """
                    INSERT INTO park_status (
                        camera_id, location_name, vehicle_type, total_capacity,
                        occupied_count, vacant_count, occupancy_rate_pct, zone_pixel_occupancy_pct,
                        status_level, available_slot_ids, occupied_slot_ids, slots_detail,
                        latest_image_url, updated_at
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, 0.0, %s, %s, %s, %s, %s, NOW())
                    ON CONFLICT (camera_id) DO UPDATE SET
                        location_name = EXCLUDED.location_name,
                        vehicle_type = EXCLUDED.vehicle_type,
                        total_capacity = EXCLUDED.total_capacity,
                        occupied_count = EXCLUDED.occupied_count,
                        vacant_count = EXCLUDED.vacant_count,
                        occupancy_rate_pct = EXCLUDED.occupancy_rate_pct,
                        status_level = EXCLUDED.status_level,
                        available_slot_ids = EXCLUDED.available_slot_ids,
                        occupied_slot_ids = EXCLUDED.occupied_slot_ids,
                        slots_detail = EXCLUDED.slots_detail,
                        updated_at = NOW();
                    """,
                    (
                        cam_id,
                        name,
                        vehicle_type,
                        total_slots,
                        occupied_count,
                        vacant_count,
                        occupancy_pct,
                        status_level,
                        Json(available_slots),
                        Json(occupied_slots),
                        Json(slots),
                        f"/api/latest/{cam_id}",
                    ),
                )

            conn.commit()
            cur.close()
            conn.close()
            logger.info(f"Successfully migrated ROI and status to database: {db_cfg['dbname']}")
        except Exception as e:
            logger.error(f"Failed to migrate database {db_cfg['dbname']}: {e}")


if __name__ == "__main__":
    migrate()
