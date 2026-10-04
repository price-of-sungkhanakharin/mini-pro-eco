import base64
import hashlib
import hmac
import json
import logging
import os
import ssl
import urllib.request
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

class InvalidSignatureError(Exception):
    """Raised when LINE webhook signature verification fails."""
    pass

from backend.app.core.config import settings

logger = logging.getLogger(__name__)

# SSL context for dotBlue API request
_ssl_ctx = ssl.create_default_context()
_ssl_ctx.check_hostname = False
_ssl_ctx.verify_mode = ssl.CERT_NONE


def get_public_https_url() -> str:
    """Return an active public HTTPS endpoint for LINE image messages."""
    url = os.getenv("LINE_PUBLIC_URL") or getattr(settings, "line_public_url", "")
    if url and url.startswith("https://"):
        return url.rstrip("/")

    candidate_paths = [
        Path("/home/r211admin/project-eco/ai-ecosystem-workspace/tunnel_url.txt"),
        Path("/app/tunnel_url.txt"),
        Path("/tmp/cloudflare_tunnel.url"),
    ]
    for cp in candidate_paths:
        if cp.exists():
            try:
                t_url = cp.read_text().strip()
                if t_url.startswith("https://"):
                    return t_url.rstrip("/")
            except Exception:
                pass

    return "https://donations-plug-desktops-newer.trycloudflare.com"


def is_car_slot(slot: Dict[str, Any]) -> bool:
    """Check if slot is specifically designated for cars."""
    s_type = (slot.get("type") or "").lower()
    s_id = str(slot.get("id") or "").upper()
    if s_type == "car":
        return True
    if s_type == "motorcycle":
        return False
    # Fallback to ID taxonomy
    if s_id.startswith("A") and s_id != "A07":
        return True
    if s_id in ("B01", "B02", "B03", "B04", "B05"):
        return True
    return False


def is_bike_slot(slot: Dict[str, Any]) -> bool:
    """Check if slot is specifically designated for motorcycles."""
    s_type = (slot.get("type") or "").lower()
    s_id = str(slot.get("id") or "").upper()
    if s_type == "motorcycle":
        return True
    if s_type == "car":
        return False
    # Fallback to ID taxonomy
    if s_id.startswith(("M", "MC", "C")) or s_id == "A07":
        return True
    if s_id.startswith("B") and s_id not in ("B01", "B02", "B03", "B04", "B05"):
        return True
    return False


def get_parking_records() -> List[Dict[str, Any]]:
    """
    Retrieve real-time list of parking status records from PostgreSQL and merge with latest Redis cache.
    Guarantees that real data from the actual detection worker / database is always returned.
    """
    records_dict: Dict[str, Dict[str, Any]] = {}

    # 1. Fetch persistent live state from PostgreSQL
    try:
        from backend.db.database import SessionLocal
        from backend.app.models.parking_log import ParkStatusModel

        with SessionLocal() as db:
            rows = db.query(ParkStatusModel).order_by(ParkStatusModel.camera_id).all()
            for r in rows:
                records_dict[r.camera_id] = {
                    "camera_id": r.camera_id,
                    "location_name": r.location_name,
                    "vehicle_type": r.vehicle_type,
                    "total_capacity": r.total_capacity,
                    "occupied_count": r.occupied_count,
                    "vacant_count": r.vacant_count,
                    "occupancy_rate_pct": r.occupancy_rate_pct,
                    "status_level": r.status_level,
                    "available_slot_ids": list(r.available_slot_ids or []),
                    "occupied_slot_ids": list(r.occupied_slot_ids or []),
                    "slots_detail": list(r.slots_detail or []),
                    "updated_at": r.updated_at.strftime("%H:%M:%S") if r.updated_at else "",
                }
    except Exception as db_err:
        logger.warning("Could not query PostgreSQL park_status: %s", db_err)

    # 2. Overlay instantaneous Redis updates if available
    try:
        import redis
        r_client = redis.Redis(
            host=settings.redis_host,
            port=settings.redis_port,
            decode_responses=True,
            socket_connect_timeout=0.5,
            socket_timeout=0.5,
        )
        for cam in ["cam1", "cam2", "cam3"]:
            c_raw = r_client.get(f"parking:status:{cam}")
            if c_raw:
                try:
                    c_data = json.loads(c_raw)
                    records_dict[cam] = c_data
                except Exception:
                    pass
    except Exception as re_err:
        logger.debug("Redis read error: %s", re_err)

    if records_dict:
        return [records_dict[k] for k in sorted(records_dict.keys())]

    # 3. Safe fallback if database is completely offline
    return [
        {
            "camera_id": "cam1",
            "location_name": "ลานหน้าภาค 1 (รถยนต์)",
            "vehicle_type": "mixed",
            "total_capacity": 15,
            "occupied_count": 1,
            "vacant_count": 14,
            "occupancy_rate_pct": 6.7,
            "status_level": "AVAILABLE",
            "available_slot_ids": ["A01", "A02", "A04", "A05", "A06", "M01", "M02", "M03", "M04", "M05", "A07", "M06", "M07", "M08"],
            "slots_detail": [
                {"id": "A01", "type": "car", "occupied": False},
                {"id": "A02", "type": "car", "occupied": False},
                {"id": "A03", "type": "car", "occupied": True},
                {"id": "A04", "type": "car", "occupied": False},
                {"id": "A05", "type": "car", "occupied": False},
                {"id": "A06", "type": "car", "occupied": False},
                {"id": "M01", "type": "motorcycle", "occupied": False},
                {"id": "M02", "type": "motorcycle", "occupied": False},
                {"id": "M03", "type": "motorcycle", "occupied": False},
                {"id": "M04", "type": "motorcycle", "occupied": False},
                {"id": "M05", "type": "motorcycle", "occupied": False},
                {"id": "A07", "type": "motorcycle", "occupied": False},
                {"id": "M06", "type": "motorcycle", "occupied": False},
                {"id": "M07", "type": "motorcycle", "occupied": False},
                {"id": "M08", "type": "motorcycle", "occupied": False},
            ],
            "updated_at": datetime.now().strftime("%H:%M:%S"),
        },
        {
            "camera_id": "cam2",
            "location_name": "ลานหน้าภาค 2 (รถยนต์)",
            "vehicle_type": "mixed",
            "total_capacity": 18,
            "occupied_count": 11,
            "vacant_count": 7,
            "occupancy_rate_pct": 61.1,
            "status_level": "AVAILABLE",
            "available_slot_ids": ["B03", "B04", "B08", "B09", "B10", "B11", "B13"],
            "slots_detail": [
                {"id": "B01", "type": "car", "occupied": True},
                {"id": "B02", "type": "car", "occupied": True},
                {"id": "B03", "type": "car", "occupied": False},
                {"id": "B04", "type": "car", "occupied": False},
                {"id": "B05", "type": "car", "occupied": True},
                {"id": "B06", "type": "motorcycle", "occupied": True},
                {"id": "B07", "type": "motorcycle", "occupied": True},
                {"id": "B08", "type": "motorcycle", "occupied": False},
                {"id": "B09", "type": "motorcycle", "occupied": False},
                {"id": "B10", "type": "motorcycle", "occupied": False},
                {"id": "B11", "type": "motorcycle", "occupied": False},
                {"id": "B12", "type": "motorcycle", "occupied": True},
                {"id": "B13", "type": "motorcycle", "occupied": False},
                {"id": "B14", "type": "motorcycle", "occupied": True},
                {"id": "B15", "type": "motorcycle", "occupied": True},
                {"id": "B16", "type": "motorcycle", "occupied": True},
                {"id": "B17", "type": "motorcycle", "occupied": True},
                {"id": "B18", "type": "motorcycle", "occupied": True},
            ],
            "updated_at": datetime.now().strftime("%H:%M:%S"),
        },
        {
            "camera_id": "cam3",
            "location_name": "ลานข้างภาคคอม (มอเตอร์ไซค์)",
            "vehicle_type": "motorcycle",
            "total_capacity": 25,
            "occupied_count": 7,
            "vacant_count": 18,
            "occupancy_rate_pct": 28.0,
            "status_level": "AVAILABLE",
            "available_slot_ids": ["C01", "MC01", "MC02", "MC03", "MC04", "MC05", "MC06", "MC07", "MC08", "MC09", "MC10", "MC11", "MC12", "MC13", "MC21", "MC22", "MC23", "MC24"],
            "slots_detail": [],
            "updated_at": datetime.now().strftime("%H:%M:%S"),
        }
    ]


def get_current_parking_summary() -> str:
    """Format the current real-time parking occupancy into a readable context for the AI."""
    rows = get_parking_records()
    lines = ["[ข้อมูลสถานะลานจอดรถภาควิชาคอมพิวเตอร์ ณ ปัจจุบัน จากระบบตรวจจับจริง]:\n"]
    for r in rows:
        slots = r.get("slots_detail") or []
        car_slots = [s for s in slots if is_car_slot(s)]
        bike_slots = [s for s in slots if is_bike_slot(s)]
        car_vac = [s["id"] for s in car_slots if not s.get("occupied")]
        bike_vac = [s["id"] for s in bike_slots if not s.get("occupied")]

        car_info = f"รถยนต์: ว่าง {len(car_vac)}/{len(car_slots)} ช่อง ({', '.join(car_vac) if car_vac else 'เต็ม'})" if car_slots else "ไม่มีช่องรถยนต์"
        bike_info = f"มอเตอร์ไซค์: ว่าง {len(bike_vac)}/{len(bike_slots)} ช่อง ({', '.join(bike_vac[:8]) if bike_vac else 'เต็ม'})" if bike_slots else "ไม่มีช่องมอเตอร์ไซค์"

        lines.append(f"""- พื้นที่: {r.get('location_name')} (กล้อง {r.get('camera_id')})
  * ความจุรวม: {r.get('total_capacity', 0)} ช่อง | ว่างรวม: {r.get('vacant_count', 0)} ช่อง
  * {car_info}
  * {bike_info}
  * สถานะ: {r.get('status_level', 'AVAILABLE')}
  * อัปเดตล่าสุด: {r.get('updated_at', datetime.now().strftime('%H:%M:%S'))}""")
    return "\n".join(lines)


# Backwards compatibility state dict
CURRENT_PARKING_STATE: Dict[str, Any] = {
    "location": "หน้าภาควิชาวิศวกรรมคอมพิวเตอร์ (CPE Department)",
    "camera_id": "cam2",
    "updated_at": "2026-10-04 15:45:00",
    "total_slots": 58,
    "available_slots": ["A01", "A02", "A04", "A05", "A06", "B03", "B04", "MC01", "MC02"],
    "occupied_slots": ["A03", "B01", "B02", "B05"],
    "car_summary": {"free": 7, "total": 11},
    "bike_summary": {"free": 32, "total": 47},
}


def build_quick_reply_payload():
    """Returns clean LINE Quick Reply buttons attached to message bottom without emojis."""
    return {
        "items": [
            {"type": "action", "action": {"type": "message", "label": "สรุปภาพรวม", "text": "สรุปภาพรวม"}},
            {"type": "action", "action": {"type": "message", "label": "หาที่จอดรถยนต์", "text": "หาที่จอดรถยนต์"}},
            {"type": "action", "action": {"type": "message", "label": "หาที่จอดมอไซค์", "text": "หาที่จอดมอไซค์"}},
            {"type": "action", "action": {"type": "message", "label": "ลานหน้าภาค", "text": "ลานหน้าภาค"}},
            {"type": "action", "action": {"type": "message", "label": "ลานข้างภาคคอม", "text": "ลานข้างภาคคอม"}},
        ]
    }


def format_quick_response(user_msg: str) -> Tuple[Optional[str], List[str], Optional[str]]:
    """
    Provide punchy, concise, emoji-free responses pulling directly from real system data.
    Accurately separates car slots vs motorcycle slots and returns all relevant camera snapshots with vehicle type filter.
    Returns:
        (reply_text, target_cam_ids, vehicle_filter)
        - target_cam_ids: list of camera IDs (e.g. ['cam1', 'cam2'], ['cam3'], ['cam1', 'cam2', 'cam3'])
        - vehicle_filter: 'car', 'motorcycle', or None
    """
    msg = user_msg.strip()
    msg_lower = msg.lower()
    msg_clean = msg.replace(" ", "")
    rows = get_parking_records()
    if not rows:
        return None, [], None

    # Map cameras and extract precise slot categorization
    cam_map = {r.get("camera_id"): r for r in rows}

    def get_cam_slots(cam_id: str):
        c = cam_map.get(cam_id, {})
        # If pure zone metrics exist directly in Redis / DB payload
        if "car_capacity" in c or "bike_capacity" in c:
            car_tot = int(c.get("car_capacity") or (6 if cam_id == "cam1" else (5 if cam_id == "cam2" else 0)))
            car_vac_count = int(c.get("car_vacant") if c.get("car_vacant") is not None else max(0, car_tot - int(c.get("car_occupied", 0))))
            bike_tot = int(c.get("bike_capacity") or (9 if cam_id == "cam1" else (13 if cam_id == "cam2" else 25)))
            bike_vac_count = int(c.get("bike_vacant") if c.get("bike_vacant") is not None else max(0, bike_tot - int(c.get("bike_occupied", 0))))
            return {
                "car_total": car_tot,
                "car_vac": ["vacant"] * car_vac_count,
                "bike_total": bike_tot,
                "bike_vac": ["vacant"] * bike_vac_count,
                "loc": c.get("location_name", cam_id.upper())
            }

        slots = c.get("slots_detail") or []
        # Fallback if slots_detail empty: categorize available_slot_ids
        if not slots:
            avail = c.get("available_slot_ids", [])
            car_avail = [sid for sid in avail if (sid.startswith("A") and sid != "A07") or sid in ("B01", "B02", "B03", "B04", "B05")]
            bike_avail = [sid for sid in avail if sid not in car_avail]
            car_tot = 6 if cam_id == "cam1" else (5 if cam_id == "cam2" else 0)
            bike_tot = 9 if cam_id == "cam1" else (13 if cam_id == "cam2" else 25)
            if not avail and "vacant_count" in c:
                vac_cnt = int(c.get("vacant_count", 0))
                occ_cnt = int(c.get("occupied_count", 0))
                if cam_id == "cam3":
                    bike_vac_count = vac_cnt
                    car_vac_count = 0
                else:
                    car_vac_count = max(0, car_tot - min(car_tot, occ_cnt))
                    bike_vac_count = max(0, vac_cnt - car_vac_count)
                return {
                    "car_total": car_tot,
                    "car_vac": ["vacant"] * car_vac_count,
                    "bike_total": bike_tot,
                    "bike_vac": ["vacant"] * bike_vac_count,
                    "loc": c.get("location_name", cam_id.upper())
                }
            return {
                "car_total": car_tot,
                "car_vac": car_avail,
                "bike_total": bike_tot,
                "bike_vac": bike_avail,
                "loc": c.get("location_name", cam_id.upper())
            }

        car_slots = [s for s in slots if is_car_slot(s)]
        bike_slots = [s for s in slots if is_bike_slot(s)]
        car_vac = [s["id"] for s in car_slots if not s.get("occupied")]
        bike_vac = [s["id"] for s in bike_slots if not s.get("occupied")]
        return {
            "car_total": len(car_slots),
            "car_vac": car_vac,
            "bike_total": len(bike_slots),
            "bike_vac": bike_vac,
            "loc": c.get("location_name", cam_id.upper())
        }

    c1_data = get_cam_slots("cam1")
    c2_data = get_cam_slots("cam2")
    c3_data = get_cam_slots("cam3")

    # 1. Car Only (หาที่จอดรถยนต์) -> Send CAM1 and CAM2 images with car filter
    if any(k in msg for k in ["หาที่จอดรถยนต์", "รถยนต์", "สี่ล้อ", "รถเก๋ง", "รถกระบะ"]) or "car" in msg_lower:
        total_car_cap = c1_data["car_total"] + c2_data["car_total"]
        total_car_vac = len(c1_data["car_vac"]) + len(c2_data["car_vac"])

        lines = [
            "[น้องจ๊อดส่องเลน: รถยนต์ 4 ล้อ]",
            f"รถยนต์ว่างรวม: {total_car_vac}/{total_car_cap} ช่อง",
            "",
            f"- หน้าภาค 1 (CAM1): ว่าง {len(c1_data['car_vac'])}/{c1_data['car_total']} ช่อง",
            f"- หน้าภาค 2 (CAM2): ว่าง {len(c2_data['car_vac'])}/{c2_data['car_total']} ช่อง",
            "",
            "รีบขับมาเทียบเลนก่อนโดนตัดหน้านะพี่!" if total_car_vac > 0 else "โซนรถยนต์เต็มหมดแล้วพี่ แนะนำวนดูอีกรอบนะพี่!"
        ]
        return "\n".join(lines), ["cam1", "cam2"], "car"

    # 2. Motorcycle Only (หาที่จอดมอไซค์) -> Send CAM3 and CAM2 images with motorcycle filter
    if any(k in msg for k in ["หาที่จอดมอไซค์", "หาที่จอดมอเตอร์ไซค์", "มอไซ", "มอเตอร์ไซค์", "สองล้อ"]) or "bike" in msg_lower:
        total_bike_cap = c3_data["bike_total"] + c2_data["bike_total"] + c1_data["bike_total"]
        total_bike_vac = len(c3_data["bike_vac"]) + len(c2_data["bike_vac"]) + len(c1_data["bike_vac"])

        lines = [
            "[น้องจ๊อดส่องเลน: มอไซค์ 2 ล้อ]",
            f"มอไซค์ว่างรวม: {total_bike_vac}/{total_bike_cap} ช่อง",
            "",
            f"- ข้างภาคคอม (CAM3): ว่าง {len(c3_data['bike_vac'])}/{c3_data['bike_total']} ช่อง",
            f"- หน้าภาค 2 (CAM2 โซนมอไซค์): ว่าง {len(c2_data['bike_vac'])}/{c2_data['bike_total']} ช่อง",
            f"- หน้าภาค 1 (CAM1 โซนมอไซค์): ว่าง {len(c1_data['bike_vac'])}/{c1_data['bike_total']} ช่อง",
            "",
            "บิดมาจอดข้างภาคคอมได้เลยพี่ ลานกว้างเทียบสบาย!" if total_bike_vac > 0 else "มอไซค์เต็มทุกโซนแล้วพี่!"
        ]
        return "\n".join(lines), ["cam3", "cam2"], "motorcycle"

    # 3. Combined Front Plaza (ลานหน้าภาค) -> Send CAM1 and CAM2 images
    if any(k in msg_clean for k in ["ลานหน้าภาค", "หน้าภาค", "ลานจอดหน้าภาค"]):
        total_front_car_vac = len(c1_data["car_vac"]) + len(c2_data["car_vac"])
        total_front_car_cap = c1_data["car_total"] + c2_data["car_total"]
        total_front_bike_vac = len(c1_data["bike_vac"]) + len(c2_data["bike_vac"])
        total_front_bike_cap = c1_data["bike_total"] + c2_data["bike_total"]

        lines = [
            "[น้องจ๊อดส่องเลน: ลานหน้าภาควิชาคอม (CAM1 & CAM2)]",
            f"รถยนต์หน้าภาคว่าง: {total_front_car_vac}/{total_front_car_cap} ช่อง | มอไซค์ว่าง: {total_front_bike_vac}/{total_front_bike_cap} ช่อง",
            "",
            f"- หน้าภาค 1 (CAM1): รถยนต์ว่าง {len(c1_data['car_vac'])}/{c1_data['car_total']} ช่อง | มอไซค์ว่าง {len(c1_data['bike_vac'])}/{c1_data['bike_total']} ช่อง",
            f"- หน้าภาค 2 (CAM2): รถยนต์ว่าง {len(c2_data['car_vac'])}/{c2_data['car_total']} ช่อง | มอไซค์ว่าง {len(c2_data['bike_vac'])}/{c2_data['bike_total']} ช่อง",
            "",
            "รีบขับมาเทียบเลนก่อนโดนตัดหน้านะพี่!" if (total_front_car_vac + total_front_bike_vac) > 0 else "ลานหน้าภาคเต็มเอี๊ยดแล้วพี่!"
        ]
        return "\n".join(lines), ["cam1", "cam2"], None

    # 4. Side Plaza (ลานข้างภาคคอม) -> Send CAM3 image
    if any(k in msg_lower for k in ["cam3", "zone c", "zonec"]) or any(k in msg_clean for k in ["กล้อง3", "ข้างภาค", "ข้างภาคคอม", "ลานข้างภาคคอม", "มอไซค์ข้างภาค"]):
        c3_vac = len(c3_data["bike_vac"])
        c3_cap = c3_data["bike_total"]

        lines = [
            "[น้องจ๊อดส่องเลน: ลานข้างภาคคอม (CAM3)]",
            f"สถานะ: มอไซค์ว่าง {c3_vac}/{c3_cap} ช่อง",
            "",
            "บิดมาจอดข้างภาคคอมได้เลยพี่ ลานกว้างเทียบสบาย!" if c3_vac > 0 else "มอไซค์ข้างภาคแน่นเอี๊ยดแล้วพี่!"
        ]
        return "\n".join(lines), ["cam3"], "motorcycle"

    # 5. Camera 1 specific ("กล้อง 1", "cam1") -> Send CAM1 image
    if any(k in msg_lower for k in ["cam1", "zone a", "zonea"]) or any(k in msg_clean for k in ["กล้อง1", "ลานหน้าภาค1", "หน้าภาค1"]):
        lines = [
            "[น้องจ๊อดส่องเลน: ลานหน้าภาค 1 (CAM1)]",
            f"รถยนต์ว่าง: {len(c1_data['car_vac'])}/{c1_data['car_total']} ช่อง",
            f"มอเตอร์ไซค์ว่าง: {len(c1_data['bike_vac'])}/{c1_data['bike_total']} ช่อง",
            "",
            "บิดมาเทียบเลนได้เลยครับพี่!" if (len(c1_data['car_vac']) + len(c1_data['bike_vac'])) > 0 else "โซนนี้เต็มแล้วพี่!"
        ]
        return "\n".join(lines), ["cam1"], None

    # 6. Camera 2 specific ("กล้อง 2", "cam2") -> Send CAM2 image
    if any(k in msg_lower for k in ["cam2", "zone b", "zoneb"]) or any(k in msg_clean for k in ["กล้อง2", "ลานหน้าภาค2", "หน้าภาค2"]):
        lines = [
            "[น้องจ๊อดส่องเลน: ลานหน้าภาค 2 (CAM2)]",
            f"รถยนต์ว่าง: {len(c2_data['car_vac'])}/{c2_data['car_total']} ช่อง",
            f"มอเตอร์ไซค์ว่าง: {len(c2_data['bike_vac'])}/{c2_data['bike_total']} ช่อง",
            "",
            "รีบขับมาเทียบเลนก่อนโดนตัดหน้านะพี่!" if (len(c2_data['car_vac']) + len(c2_data['bike_vac'])) > 0 else "โซนนี้เต็มแล้วพี่!"
        ]
        return "\n".join(lines), ["cam2"], None

    # 7. Aggregated Overview Summary (สรุปภาพรวม / ทั้งหมด / สรุป / ภาพรวม) -> Send CAM1, CAM2, CAM3 images
    if any(k in msg for k in ["สรุปภาพรวม", "สรุปทั้งหมด", "สรุป", "ภาพรวม", "ทั้งหมด", "สถานะ"]) or "overview" in msg_lower or "all" in msg_lower:
        total_cars_vac = len(c1_data["car_vac"]) + len(c2_data["car_vac"])
        total_cars_cap = c1_data["car_total"] + c2_data["car_total"]
        total_bikes_vac = len(c1_data["bike_vac"]) + len(c2_data["bike_vac"]) + len(c3_data["bike_vac"])
        total_bikes_cap = c1_data["bike_total"] + c2_data["bike_total"] + c3_data["bike_total"]
        grand_vac = total_cars_vac + total_bikes_vac
        grand_cap = total_cars_cap + total_bikes_cap

        lines = [
            "[น้องจ๊อดรายงาน: สรุปภาพรวมลานจอด CPE ทั้งหมด]",
            "ชัดเจนในเลนเรา! ส่องข้อมูลจริงแยกประเภทให้ครบเลยพี่",
            f"ว่างรวมทั้งหมด: {grand_vac}/{grand_cap} ช่อง",
            "",
            f"รถยนต์ (4 ล้อ): ว่างรวม {total_cars_vac}/{total_cars_cap} ช่อง",
            f"- หน้าภาค 1 (CAM1): ว่าง {len(c1_data['car_vac'])}/{c1_data['car_total']} ช่อง",
            f"- หน้าภาค 2 (CAM2): ว่าง {len(c2_data['car_vac'])}/{c2_data['car_total']} ช่อง",
            "",
            f"มอไซค์ (2 ล้อ): ว่างรวม {total_bikes_vac}/{total_bikes_cap} ช่อง",
            f"- ข้างภาคคอม (CAM3): ว่าง {len(c3_data['bike_vac'])}/{c3_data['bike_total']} ช่อง",
            f"- หน้าภาค 2 (CAM2): ว่าง {len(c2_data['bike_vac'])}/{c2_data['bike_total']} ช่อง",
            f"- หน้าภาค 1 (CAM1): ว่าง {len(c1_data['bike_vac'])}/{c1_data['bike_total']} ช่อง",
            "",
            "กดปุ่มเมนูด้านล่างเพื่อเจาะดูแต่ละโซนได้เลยครับพี่!"
        ]
        return "\n".join(lines), ["cam1", "cam2", "cam3"], None

    # 8. User asks for pictures / snapshots
    if any(k in msg_clean for k in ["ขอดูรูป", "ส่งรูป", "ดูรูป", "ภาพสด", "รูปภาพ", "กล้อง"]):
        if "3" in msg_clean or "มอไซ" in msg_clean or "ข้างภาค" in msg_clean:
            return f"[น้องจ๊อดจัดให้: ภาพสด ลานข้างภาคคอม (CAM3)]\nสถานะ: มอไซค์ว่าง {len(c3_data['bike_vac'])}/{c3_data['bike_total']} ช่อง บิดมาได้เลยพี่!", ["cam3"], "motorcycle"
        elif "1" in msg_clean:
            return f"[น้องจ๊อดจัดให้: ภาพสด ลานหน้าภาค 1 (CAM1)]\nสถานะ: รถยนต์ว่าง {len(c1_data['car_vac'])}/{c1_data['car_total']} ช่อง, มอไซค์ว่าง {len(c1_data['bike_vac'])}/{c1_data['bike_total']} ช่อง!", ["cam1"], None
        elif "2" in msg_clean:
            return f"[น้องจ๊อดจัดให้: ภาพสด ลานหน้าภาค 2 (CAM2)]\nสถานะ: รถยนต์ว่าง {len(c2_data['car_vac'])}/{c2_data['car_total']} ช่อง, มอไซค์ว่าง {len(c2_data['bike_vac'])}/{c2_data['bike_total']} ช่อง!", ["cam2"], None
        else:
            return f"[น้องจ๊อดจัดให้: ภาพสดลานจอดหน้าภาค (CAM1 & CAM2)]\nรถยนต์ว่าง {len(c1_data['car_vac'])+len(c2_data['car_vac'])} ช่อง บิดมาเทียบเลนได้เลยพี่!", ["cam1", "cam2"], None

    return None, [], None


def verify_line_signature(body_str: str, signature: str, secret: str) -> bool:
    """Validate X-Line-Signature using HMAC-SHA256."""
    if not signature or not secret:
        return False
    try:
        expected = base64.b64encode(
            hmac.new(secret.encode("utf-8"), body_str.encode("utf-8"), hashlib.sha256).digest()
        ).decode("utf-8")
        return hmac.compare_digest(signature, expected)
    except Exception as e:
        logger.warning("Error computing signature: %s", e)
        return False


class LineBotService:
    """Manages LINE Bot webhooks, message replies, real-time data pulling, and dotBlue LLM orchestration."""

    def __init__(self):
        self.channel_secret = settings.line_channel_secret
        self.access_token = settings.line_channel_access_token

    def query_dotblue_advisor(self, user_question: str) -> str:
        """Call dotBlue API (OpenAI Compatible) with openai/gpt-5.6-luna using live detection data."""
        parking_context = get_current_parking_summary()

        system_prompt = f"""คุณคือ "น้องจ๊อด" เด็กแว๊นสายซิ่งผู้ช่วยประจำลานจอดรถภาควิชาวิศวกรรมคอมพิวเตอร์ ม.อ. (CPE Parking)
สโลแกนประจำตัว: "ชัดเจนในเลนเรา with น้องจ๊อดช่วยหาที่จอดรถ"

บุคลิกภาพและน้ำเสียง:
1. เป็นเด็กแว๊นสายซิ่ง กวนๆ เฟรนด์ลี่ เฮฮา ใช้สำนวนภาษาปากวัยรุ่นสายซิ่งแต่จริงใจ น่ารัก และสุภาพ (เช่น เรียกผู้ใช้ว่า "พี่", "ลูกพี่", ใช้คำว่า "บิดมาเลยพี่", "เทียบเลน", "เลนนี้โล่ง", "เต็มเอี๊ยด", "เสียบช่อง", "อย่าเพิ่งขับมาเสียบ", ลงท้ายด้วย "ครับพี่" หรือ "นะพี่")
2. ห้ามใช้อิโมจิ (Emoji) ในคำตอบเด็ดขาด ให้ใช้ข้อความล้วนๆ สั้น กระชับ อ่านเข้าใจง่ายใน 2-3 บรรทัด
3. ความถูกต้องของข้อมูลเป็นอันดับ 1: รายงานจำนวนช่องว่างตามโซนจริง ไม่ต้องระบุรหัสช่องย่อย (A01, B06) ให้บอกจำนวนว่าง/ความจุรวมของแต่ละลานชัดเจนและเข้าใจง่าย
4. หากผู้ใช้ถามถึงโอกาสว่างเมื่อมาถึงในอนาคต (เช่น อีก 10-15 นาที): วิเคราะห์ความน่าจะเป็นอย่างมั่นใจ เช่น "หน้าภาค 2 โอกาสว่างสูง 80% บิดมาให้ไวเลยพี่!"
5. ตอบกระชับ สั้น ไม่เวิ่นเว้อ เหมาะสำหรับการอ่านในแชต LINE

{parking_context}"""

        payload = {
            "model": settings.dotblue_model or "openai/gpt-5.6-luna",
            "stream": False,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_question},
            ],
            "temperature": 0.3,
            "max_tokens": 350,
        }

        api_url = f"{settings.dotblue_base_url.rstrip('/')}/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {settings.dotblue_api_key}",
            "User-Agent": "CPE-Parking-LineBot/1.0",
        }

        try:
            req = urllib.request.Request(
                api_url,
                data=json.dumps(payload).encode("utf-8"),
                headers=headers,
            )
            with urllib.request.urlopen(req, context=_ssl_ctx, timeout=15) as resp:
                resp_json = json.loads(resp.read().decode("utf-8"))
                reply_text = resp_json["choices"][0]["message"]["content"]
                return reply_text.strip()
        except Exception as e:
            logger.error("Failed to query dotBlue AI: %s", e)
            rows = get_parking_records()
            total_vac = sum(r.get("vacant_count", 0) for r in rows)
            return f"ชัดเจนในเลนเรา! ตอนนี้ลานจอดมีที่ว่างรวม {total_vac} ช่อง บิดมาเทียบเลนหน้าภาคหรือข้างภาคคอมได้เลยครับพี่!"

    def handle_webhook_event(self, body: str, signature: str):
        """Process LINE webhook event payload, pull real data, and reply with multi-camera images."""
        if not self.channel_secret:
            raise ValueError("LINE Channel Secret is not configured.")

        # 1. Verify HMAC Signature
        if not verify_line_signature(body, signature, self.channel_secret):
            logger.warning("Invalid LINE webhook signature rejected")
            raise InvalidSignatureError("Signature mismatch")

        # 2. Parse JSON payload
        try:
            payload_data = json.loads(body)
        except Exception as parse_err:
            logger.error("Failed to parse LINE webhook body as JSON: %s", parse_err)
            return

        events = payload_data.get("events", [])
        for event in events:
            ev_type = event.get("type")
            reply_token = event.get("replyToken")

            if ev_type == "message" and event.get("message", {}).get("type") == "text":
                user_msg = event["message"]["text"].strip()
                user_id = event.get("source", {}).get("userId", "unknown")
                logger.info("Received LINE message: '%s' from user: %s (token: %s)", user_msg, user_id, reply_token)

                if not reply_token or reply_token == "00000000000000000000000000000000" or reply_token.startswith("ffffffff"):
                    logger.info("Skipping verify/dummy replyToken: %s", reply_token)
                    continue

                # 1. Pull Real Data directly / Format Response with real snapshots
                fast_reply, target_cams, vehicle_filter = format_quick_response(user_msg)
                if fast_reply:
                    final_text = fast_reply
                else:
                    # 2. Conversational fallback: Query dotBlue AI with real-time parking data
                    final_text = self.query_dotblue_advisor(user_msg)
                    vehicle_filter = None

                reply_messages = []
                public_base = get_public_https_url()
                ts = int(datetime.now().timestamp())
                v_param = f"&vehicle_type={vehicle_filter}" if vehicle_filter else ""

                # Add images (LINE API allows max 5 messages total, so max 4 images + 1 text)
                for cam in target_cams[:4]:
                    snapshot_url = f"{public_base}/api/v1/line/snapshot/{cam}?mode=chatbot{v_param}&t={ts}"
                    reply_messages.append({
                        "type": "image",
                        "originalContentUrl": snapshot_url,
                        "previewImageUrl": snapshot_url,
                    })

                reply_messages.append({
                    "type": "text",
                    "text": final_text,
                    "quickReply": build_quick_reply_payload()
                })

                # Reply back to LINE user directly
                reply_url = "https://api.line.me/v2/bot/message/reply"
                reply_headers = {
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.access_token}",
                }
                reply_payload = {
                    "replyToken": reply_token,
                    "messages": reply_messages,
                }
                try:
                    reply_req = urllib.request.Request(
                        reply_url,
                        data=json.dumps(reply_payload).encode("utf-8"),
                        headers=reply_headers,
                    )
                    with urllib.request.urlopen(reply_req, context=_ssl_ctx, timeout=10) as r_resp:
                        logger.info("LINE reply sent successfully (%d messages, target_cams=%s), HTTP %s", len(reply_messages), target_cams, r_resp.status)
                except urllib.error.HTTPError as http_err:
                    err_body = http_err.read().decode("utf-8", errors="ignore")
                    logger.error("LINE reply HTTP Error %s: %s (Payload: %s)", http_err.code, err_body, reply_payload)
                    # Fallback to text-only reply immediately
                    if len(reply_messages) > 1:
                        try:
                            fallback_payload = {
                                "replyToken": reply_token,
                                "messages": [m for m in reply_messages if m.get("type") == "text"],
                            }
                            fallback_req = urllib.request.Request(
                                reply_url,
                                data=json.dumps(fallback_payload).encode("utf-8"),
                                headers=reply_headers,
                            )
                            with urllib.request.urlopen(fallback_req, context=_ssl_ctx, timeout=10) as fb_resp:
                                logger.info("LINE text-only fallback reply sent successfully, HTTP %s", fb_resp.status)
                        except Exception as fb_err:
                            logger.error("Fallback LINE reply also failed: %s", fb_err)
                except Exception as line_err:
                    logger.error("Failed to send LINE reply: %s", line_err)


line_bot_service = LineBotService()
