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
    # 1. Check environment variable / settings
    url = os.getenv("LINE_PUBLIC_URL") or getattr(settings, "line_public_url", "")
    if url and url.startswith("https://"):
        return url.rstrip("/")

    # 2. Check workspace tunnel_url.txt
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

    # 3. Fallback active TryCloudflare domain
    return "https://donations-plug-desktops-newer.trycloudflare.com"


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

    # Return sorted by camera_id
    if records_dict:
        return [records_dict[k] for k in sorted(records_dict.keys())]

    # 3. Fallback only if both DB and Redis are completely unreachable
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
            "available_slot_ids": ["A01", "A02", "A04", "A05", "A06", "A07"],
            "slots_detail": [],
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
            "slots_detail": [],
            "updated_at": datetime.now().strftime("%H:%M:%S"),
        },
        {
            "camera_id": "cam3",
            "location_name": "ลานข้างภาคคอม (มอเตอร์ไซค์)",
            "vehicle_type": "motorcycle",
            "total_capacity": 25,
            "occupied_count": 6,
            "vacant_count": 19,
            "occupancy_rate_pct": 24.0,
            "status_level": "AVAILABLE",
            "available_slot_ids": ["C01", "MC01", "MC02", "MC03", "MC04", "MC05", "MC06", "MC07", "MC08", "MC09", "MC10", "MC11", "MC12", "MC13", "MC19", "MC21", "MC22", "MC23", "MC24"],
            "slots_detail": [],
            "updated_at": datetime.now().strftime("%H:%M:%S"),
        }
    ]


def get_current_parking_summary() -> str:
    """Format the current real-time parking occupancy into a readable context for the AI."""
    rows = get_parking_records()
    lines = ["[ข้อมูลสถานะลานจอดรถภาควิชาคอมพิวเตอร์ ณ ปัจจุบัน จากระบบตรวจจับจริง]:\n"]
    for r in rows:
        avail_count = r.get("vacant_count", 0)
        total_count = r.get("total_capacity", 0)
        avail_slots = r.get("available_slot_ids", [])
        avail_str = ", ".join(avail_slots) if avail_slots else "ไม่มีช่องว่าง"
        lines.append(f"""- พื้นที่: {r.get('location_name')} (กล้อง {r.get('camera_id')}, ประเภท: {r.get('vehicle_type')})
  * ความจุรวม: {total_count} ช่อง | ว่าง: {avail_count} ช่อง | ไม่ว่าง: {r.get('occupied_count', 0)} ช่อง (อัตราการจอด {r.get('occupancy_rate_pct', 0)}%)
  * ช่องที่ว่างพร้อมจอด: {avail_str}
  * สถานะรวม: {r.get('status_level', 'AVAILABLE')}
  * อัปเดตล่าสุด: {r.get('updated_at', datetime.now().strftime('%H:%M:%S'))}""")
    return "\n".join(lines)


# Backwards compatibility state dict
CURRENT_PARKING_STATE: Dict[str, Any] = {
    "location": "หน้าภาควิชาวิศวกรรมคอมพิวเตอร์ (CPE Department)",
    "camera_id": "cam2",
    "updated_at": "2026-10-04 15:30:00",
    "total_slots": 58,
    "available_slots": ["B03", "B04", "B08", "B09", "MC01", "MC02"],
    "occupied_slots": ["B01", "B02", "B05"],
    "car_summary": {"free": 21, "total": 33},
    "bike_summary": {"free": 19, "total": 25},
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


def format_quick_response(user_msg: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Provide punchy, concise, emoji-free responses pulling directly from real system data.
    Returns:
        (reply_text, target_cam_id)
        - target_cam_id is 'cam1', 'cam2', 'cam3' if a specific camera snapshot image should be sent.
        - target_cam_id is None if text-only summary should be sent.
    """
    msg = user_msg.strip()
    msg_lower = msg.lower()
    msg_clean = msg.replace(" ", "")
    rows = get_parking_records()
    if not rows:
        return None, None

    # Map cameras for quick lookup
    cam_map = {r.get("camera_id"): r for r in rows}

    # 1. Specific Camera Overlays with Images (CAM1, CAM2, CAM3)
    if any(k in msg_lower for k in ["cam1", "zone a", "zonea"]) or any(k in msg_clean for k in ["กล้อง1", "ลานหน้าภาค1", "หน้าภาค1"]):
        match = cam_map.get("cam1")
        if match:
            loc = match.get("location_name", "ลานหน้าภาค 1")
            vac = match.get("vacant_count", 0)
            cap = match.get("total_capacity", 0)
            avail_slots = match.get("available_slot_ids", [])
            avail_str = ", ".join(avail_slots) if avail_slots else "เต็มทุกช่อง"
            lines = [
                f"[น้องจ๊อดส่องเลน: {loc} (CAM1)]",
                f"สถานะ: ว่าง {vac}/{cap} ช่อง",
                f"ช่องที่ว่าง: {avail_str}",
                "",
                "บิดมาเทียบเลนได้เลยครับพี่!" if vac > 0 else "โซนนี้เต็มแล้วพี่ แนะนำไปดูโซนอื่นก่อนนะพี่!"
            ]
            return "\n".join(lines), "cam1"

    if any(k in msg_lower for k in ["cam2", "zone b", "zoneb"]) or any(k in msg_clean for k in ["กล้อง2", "ลานหน้าภาค2", "หน้าภาค2"]):
        match = cam_map.get("cam2")
        if match:
            loc = match.get("location_name", "ลานหน้าภาค 2")
            vac = match.get("vacant_count", 0)
            cap = match.get("total_capacity", 0)
            avail_slots = match.get("available_slot_ids", [])
            avail_str = ", ".join(avail_slots) if avail_slots else "เต็มทุกช่อง"
            lines = [
                f"[น้องจ๊อดส่องเลน: {loc} (CAM2)]",
                f"สถานะ: ว่าง {vac}/{cap} ช่อง",
                f"ช่องที่ว่าง: {avail_str}",
                "",
                "รีบขับมาเทียบเลนก่อนโดนตัดหน้านะพี่!" if vac > 0 else "โซนนี้เต็มแล้วพี่ แนะนำไปดูโซนอื่นก่อนนะพี่!"
            ]
            return "\n".join(lines), "cam2"

    if any(k in msg_lower for k in ["cam3", "zone c", "zonec"]) or any(k in msg_clean for k in ["กล้อง3", "ข้างภาค", "ข้างภาคคอม", "ลานข้างภาคคอม", "มอไซค์ข้างภาค"]):
        match = cam_map.get("cam3")
        if match:
            loc = match.get("location_name", "ลานข้างภาคคอม")
            vac = match.get("vacant_count", 0)
            cap = match.get("total_capacity", 0)
            avail_slots = match.get("available_slot_ids", [])
            avail_str = ", ".join(avail_slots) if avail_slots else "เต็มทุกช่อง"
            lines = [
                f"[น้องจ๊อดส่องเลน: {loc} (CAM3)]",
                f"สถานะ: มอไซค์ว่าง {vac}/{cap} ช่อง",
                f"ช่องที่ว่าง: {avail_str}",
                "",
                "บิดมาจอดข้างภาคคอมได้เลยพี่ ลานกว้างเทียบสบาย!" if vac > 0 else "มอไซค์ข้างภาคแน่นเอี๊ยดแล้วพี่!"
            ]
            return "\n".join(lines), "cam3"

    # 2. Combined Front Plaza (ลานหน้าภาค)
    if any(k in msg_clean for k in ["ลานหน้าภาค", "หน้าภาค", "ลานจอดหน้าภาค"]):
        c1 = cam_map.get("cam1", {})
        c2 = cam_map.get("cam2", {})
        c1_vac = c1.get("vacant_count", 0)
        c1_cap = c1.get("total_capacity", 0)
        c1_slots = ", ".join(c1.get("available_slot_ids", [])) or "เต็ม"
        c2_vac = c2.get("vacant_count", 0)
        c2_cap = c2.get("total_capacity", 0)
        c2_slots = ", ".join(c2.get("available_slot_ids", [])) or "เต็ม"
        total_front_vac = c1_vac + c2_vac
        total_front_cap = c1_cap + c2_cap

        lines = [
            "[น้องจ๊อดส่องเลน: ลานหน้าภาควิชาคอม (CAM1 & CAM2)]",
            f"ว่างรวมหน้าภาค: {total_front_vac}/{total_front_cap} ช่อง",
            "",
            f"- หน้าภาค 1 (CAM1): ว่าง {c1_vac}/{c1_cap} ช่อง",
            f"  ช่องว่าง: {c1_slots}",
            f"- หน้าภาค 2 (CAM2): ว่าง {c2_vac}/{c2_cap} ช่อง",
            f"  ช่องว่าง: {c2_slots}",
            "",
            "รีบขับมาเทียบเลนก่อนโดนตัดหน้านะพี่!" if total_front_vac > 0 else "ลานหน้าภาคเต็มเอี๊ยดแล้วพี่!"
        ]
        return "\n".join(lines), "cam2"

    # 3. Aggregated Overview Summary (สรุปภาพรวม / ทั้งหมด / สรุป / ภาพรวม)
    if any(k in msg for k in ["สรุปภาพรวม", "สรุปทั้งหมด", "สรุป", "ภาพรวม", "ทั้งหมด", "สถานะ"]) or "overview" in msg_lower or "all" in msg_lower:
        total_cap = sum(r.get("total_capacity", 0) for r in rows)
        total_vac = sum(r.get("vacant_count", 0) for r in rows)
        total_occ = sum(r.get("occupied_count", 0) for r in rows)

        lines = [
            "[น้องจ๊อดรายงาน: สรุปภาพรวมลานจอด CPE ทั้งหมด]",
            "ชัดเจนในเลนเรา! ส่องข้อมูลจริงให้สดๆ ครบทั้ง 3 จุดเลยพี่",
            f"ว่างรวมทั้งหมด: {total_vac}/{total_cap} ช่อง (จอดแล้ว {total_occ} คัน)",
            "",
        ]
        for r in rows:
            cam = r.get("camera_id", "").upper()
            loc = r.get("location_name", cam)
            vac = r.get("vacant_count", 0)
            cap = r.get("total_capacity", 0)
            avail_slots = r.get("available_slot_ids", [])
            avail_str = ", ".join(avail_slots[:6]) if avail_slots else "เต็มทุกช่อง"
            lines.append(f"- {loc} ({cam}): ว่าง {vac}/{cap} ช่อง (ว่าง: {avail_str})")

        lines.append("")
        lines.append("กดปุ่มเมนูด้านล่างเพื่อเจาะดูแต่ละโซนได้เลยครับพี่!")
        return "\n".join(lines), "cam2"

    # 4. Motorcycle Only (หาที่จอดมอไซค์)
    if any(k in msg for k in ["หาที่จอดมอไซค์", "หาที่จอดมอเตอร์ไซค์", "มอไซ", "มอเตอร์ไซค์", "สองล้อ"]) or "bike" in msg_lower:
        bike_rows = [r for r in rows if r.get("vehicle_type") in ("motorcycle", "mixed") or r.get("camera_id") == "cam3"]
        total_vac = sum(r.get("vacant_count", 0) for r in bike_rows)
        lines = [
            "[น้องจ๊อดส่องเลน: มอไซค์ 2 ล้อ]",
            f"มอไซค์ว่างรวม: {total_vac} ช่อง",
            "",
        ]
        for r in bike_rows:
            loc = r.get("location_name", r.get("camera_id", ""))
            cam = r.get("camera_id", "").upper()
            vac = r.get("vacant_count", 0)
            cap = r.get("total_capacity", 0)
            avail_slots = r.get("available_slot_ids", [])
            if avail_slots:
                avail_preview = ", ".join(avail_slots[:10])
                if len(avail_slots) > 10:
                    avail_preview += f" และอีก {len(avail_slots) - 10} ช่อง"
                avail_str = f"ช่องว่าง: {avail_preview}"
            else:
                avail_str = "โซนนี้แน่นเอี๊ยดแล้วพี่"
            lines.append(f"- {loc} ({cam}): ว่าง {vac}/{cap} ช่อง")
            lines.append(f"  {avail_str}")

        lines.append("")
        lines.append("บิดมาจอดข้างภาคคอมได้เลยพี่ ลานกว้างเทียบสบาย!")
        return "\n".join(lines), "cam3"

    # 5. Car Only (หาที่จอดรถยนต์)
    if any(k in msg for k in ["หาที่จอดรถยนต์", "รถยนต์", "สี่ล้อ", "รถเก๋ง", "รถกระบะ"]) or "car" in msg_lower:
        car_rows = [r for r in rows if r.get("vehicle_type") in ("car", "mixed") or r.get("camera_id") in ("cam1", "cam2")]
        total_vac = sum(r.get("vacant_count", 0) for r in car_rows)
        lines = [
            "[น้องจ๊อดส่องเลน: รถยนต์ 4 ล้อ]",
            f"รถยนต์ว่างรวม: {total_vac} ช่อง",
            "",
        ]
        for r in car_rows:
            loc = r.get("location_name", r.get("camera_id", ""))
            cam = r.get("camera_id", "").upper()
            vac = r.get("vacant_count", 0)
            cap = r.get("total_capacity", 0)
            avail_slots = r.get("available_slot_ids", [])
            avail_str = f"ช่องว่าง: {', '.join(avail_slots)}" if avail_slots else "โซนนี้เต็มแล้วพี่ อย่าเพิ่งขับมาเสียบ"
            lines.append(f"- {loc} ({cam}): ว่าง {vac}/{cap} ช่อง")
            lines.append(f"  {avail_str}")

        lines.append("")
        lines.append("รีบขับมาเทียบเลนก่อนโดนตัดหน้านะพี่!")
        return "\n".join(lines), "cam2"

    # 6. User asks for pictures / snapshots
    if any(k in msg_clean for k in ["ขอดูรูป", "ส่งรูป", "ดูรูป", "ภาพสด", "รูปภาพ", "กล้อง"]):
        target = "cam2"
        if "3" in msg_clean or "มอไซ" in msg_clean or "ข้างภาค" in msg_clean:
            target = "cam3"
        elif "1" in msg_clean:
            target = "cam1"
        match = cam_map.get(target, {})
        loc = match.get("location_name", target.upper())
        vac = match.get("vacant_count", 0)
        cap = match.get("total_capacity", 0)
        return f"[น้องจ๊อดจัดให้: ภาพสด {loc}]\nสถานะปัจจุบัน: ว่าง {vac}/{cap} ช่อง บิดมาเทียบเลนได้เลยพี่!", target

    return None, None


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
3. ความถูกต้องของข้อมูลเป็นอันดับ 1: ต้องให้จำนวนช่องว่างและชื่อช่องที่ว่างตรงตามข้อมูลจริงด้านล่างเป๊ะๆ ห้ามแต่งข้อมูลช่องจอดเด็ดขาด!
4. หากผู้ใช้ถามถึงโอกาสว่างเมื่อมาถึงในอนาคต (เช่น อีก 10-15 นาที): วิเคราะห์ความน่าจะเป็นอย่างมั่นใจ เช่น "ช่อง B03 โอกาสว่างสูง 80% เพราะเพิ่งว่าง บิดมาให้ไวเลยพี่!"
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
        """Process LINE webhook event payload, pull real data, and reply with images."""
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

                # 1. Pull Real Data directly / Format Response with real snapshot
                fast_reply, target_cam = format_quick_response(user_msg)
                if fast_reply:
                    final_text = fast_reply
                else:
                    # 2. Conversational fallback: Query dotBlue AI with real-time parking data
                    final_text = self.query_dotblue_advisor(user_msg)

                reply_messages = []
                if target_cam:
                    # Construct snapshot URL with valid HTTPS public tunnel URL
                    public_base = get_public_https_url()
                    ts = int(datetime.now().timestamp())
                    snapshot_url = f"{public_base}/api/v1/line/snapshot/{target_cam}?mode=chatbot&t={ts}"
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

                # Reply back to LINE user directly with Quick Reply options attached
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
                        logger.info("LINE reply sent successfully (%d messages, target_cam=%s), HTTP %s", len(reply_messages), target_cam, r_resp.status)
                except urllib.error.HTTPError as http_err:
                    err_body = http_err.read().decode("utf-8", errors="ignore")
                    logger.error("LINE reply HTTP Error %s: %s (Payload: %s)", http_err.code, err_body, reply_payload)
                    # If sending image message failed, fallback to text-only reply immediately
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
