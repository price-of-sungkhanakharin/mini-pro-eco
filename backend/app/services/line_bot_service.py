import base64
import hashlib
import hmac
import json
import logging
import ssl
import urllib.request
from datetime import datetime
from typing import Any, Dict, List, Optional

class InvalidSignatureError(Exception):
    """Raised when LINE webhook signature verification fails."""
    pass

from backend.app.core.config import settings

logger = logging.getLogger(__name__)

# SSL context for dotBlue API request
_ssl_ctx = ssl.create_default_context()
_ssl_ctx.check_hostname = False
_ssl_ctx.verify_mode = ssl.CERT_NONE

_ssl_ctx.check_hostname = False
_ssl_ctx.verify_mode = ssl.CERT_NONE

# In-memory realistic parking state (updated from snapshots / camera / ROI)
CURRENT_PARKING_STATE: Dict[str, Any] = {
    "location": "หน้าภาควิชาวิศวกรรมคอมพิวเตอร์ (CPE Department)",
    "camera_id": "cam1",
    "updated_at": "2026-09-25 16:15:00",
    "total_slots": 7,
    "available_slots": ["A03", "A05", "M02"],
    "occupied_slots": ["A01", "A02", "A04", "M01"],
    "slots_detail": [
        {"id": "A01", "type": "รถยนต์", "status": "ไม่ว่าง (Sedan ดำ กข-1234)", "occupied": True},
        {"id": "A02", "type": "รถยนต์", "status": "ไม่ว่าง (SUV ดำ ขข-5544)", "occupied": True},
        {"id": "A03", "type": "รถยนต์", "status": "ว่างพร้อมจอด", "occupied": False},
        {"id": "A04", "type": "รถยนต์", "status": "ไม่ว่าง (Sedan ขาว ฮฮ-9988)", "occupied": True},
        {"id": "A05", "type": "รถยนต์", "status": "ว่างพร้อมจอด (ช่องริมซ้าย)", "occupied": False},
        {"id": "M01", "type": "มอเตอร์ไซค์", "status": "ไม่ว่าง (Honda Wave แดง)", "occupied": True},
        {"id": "M02", "type": "มอเตอร์ไซค์", "status": "ว่างพร้อมจอด", "occupied": False},
    ],
    "car_summary": {"free": 2, "total": 5},
    "bike_summary": {"free": 1, "total": 2},
    "weather": "แดดร่ม อุณหภูมิ 31.8°C สภาพแสงกำลังดี",
    "camera_health": "ONLINE (ESP32-CAM Snapshot 5s, Temp 81.1°C, Wi-Fi -82 dBm, Free Heap 156.7KB)",
}


def get_current_parking_summary() -> str:
    """Format the current parking occupancy from Redis cache or PostgreSQL park_status into a readable context for the AI."""
    import json
    import redis

    # 1. Try instantaneous Redis cache (<0.5ms)
    try:
        r_client = redis.Redis(
            host=settings.redis_host,
            port=settings.redis_port,
            decode_responses=True,
            socket_connect_timeout=0.5,
            socket_timeout=0.5,
        )
        cached_summary = r_client.get("parking:status:summary")
        if cached_summary:
            rows = json.loads(cached_summary)
            if rows:
                lines = ["[ข้อมูลสถานะลานจอดรถภาควิชาคอมพิวเตอร์ ณ ปัจจุบัน จากระบบ Real-time Cache (Redis)]:\n"]
                for r in rows:
                    avail_count = r.get("vacant_count", 0)
                    total_count = r.get("total_capacity", 0)
                    avail_slots = r.get("available_slot_ids", [])
                    avail_str = ", ".join(avail_slots) if avail_slots else "ไม่มีช่องว่าง"
                    slot_lines = []
                    for s in (r.get("slots_detail") or []):
                        s_name = s.get("vehicle_name") or ("ไม่ว่าง" if s.get("occupied") else "ว่างพร้อมจอด")
                        s_type = "รถยนต์" if s.get("type") == "car" else "มอเตอร์ไซค์"
                        slot_lines.append(f"    - ช่อง {s.get('id')}: {s_name} ({s_type})")
                    details_str = "\n".join(slot_lines) if slot_lines else "    - ไม่พบรายละเอียดช่องจอด"
                    lines.append(f"""- พื้นที่: {r.get('location_name')} (กล้อง {r.get('camera_id')}, ประเภท: {r.get('vehicle_type')})
  * ความจุรวม: {total_count} ช่อง | ว่าง: {avail_count} ช่อง | ไม่ว่าง: {r.get('occupied_count', 0)} ช่อง (อัตราการจอด {r.get('occupancy_rate_pct', 0)}%)
  * ช่องที่ว่างพร้อมจอด: {avail_str}
  * สถานะรวม: {r.get('status_level', 'AVAILABLE')}
  * รายละเอียดช่องจอด:
{details_str}
  * อัปเดตล่าสุด: {r.get('updated_at', datetime.now().strftime('%Y-%m-%d %H:%M:%S'))}""")
                return "\n".join(lines)
    except Exception as re_err:
        logger.debug("Redis cache miss or read error: %s, falling back to PostgreSQL", re_err)

    # 2. Fallback to PostgreSQL
    from backend.db.database import SessionLocal
    from backend.app.models.parking_log import ParkStatusModel

    try:
        with SessionLocal() as db:
            rows = db.query(ParkStatusModel).order_by(ParkStatusModel.camera_id).all()
            if rows:
                lines = ["[ข้อมูลสถานะลานจอดรถภาควิชาคอมพิวเตอร์ ณ ปัจจุบัน จากฐานข้อมูล PostgreSQL]:"]
                for r in rows:
                    avail_count = r.vacant_count
                    total_count = r.total_capacity
                    avail_str = ", ".join(r.available_slot_ids) if r.available_slot_ids else "ไม่มีช่องว่าง"
                    slot_lines = []
                    for s in (r.slots_detail or []):
                        s_name = s.get("vehicle_name") or ("ไม่ว่าง" if s.get("occupied") else "ว่างพร้อมจอด")
                        s_type = "รถยนต์" if s.get("type") == "car" else "มอเตอร์ไซค์"
                        slot_lines.append(f"    - ช่อง {s.get('id')}: {s_name} ({s_type})")
                    details_str = "\n".join(slot_lines) if slot_lines else "    - ไม่พบรายละเอียดช่องจอด"
                    lines.append(f"""- พื้นที่: {r.location_name} (กล้อง {r.camera_id}, ประเภท: {r.vehicle_type})
  * ความจุรวม: {total_count} ช่อง | ว่าง: {avail_count} ช่อง | ไม่ว่าง: {r.occupied_count} ช่อง (อัตราการจอด {r.occupancy_rate_pct}%)
  * ช่องที่ว่างพร้อมจอด: {avail_str}
  * สถานะรวม: {r.status_level}
  * รายละเอียดช่องจอด:
{details_str}
  * อัปเดตล่าสุด: {r.updated_at.strftime('%Y-%m-%d %H:%M:%S') if r.updated_at else datetime.now().strftime('%Y-%m-%d %H:%M:%S')}""")
                return "\n".join(lines)
    except Exception as e:
        logger.warning("Could not query PostgreSQL park_status, falling back to cache: %s", e)

    avail_count = len(CURRENT_PARKING_STATE["available_slots"])
    total_count = CURRENT_PARKING_STATE["total_slots"]
    avail_str = ", ".join(CURRENT_PARKING_STATE["available_slots"]) if avail_count > 0 else "ไม่มีช่องว่าง"

    details = "\n".join(
        [
            f"  - ช่อง {s['id']}: {s['status']} ({s['type']})"
            for s in CURRENT_PARKING_STATE["slots_detail"]
        ]
    )

    return f"""[ข้อมูลสถานะลานจอดรถภาควิชาคอมพิวเตอร์ ณ ปัจจุบัน]:
- ตำแหน่ง: {CURRENT_PARKING_STATE['location']} (กล้อง {CURRENT_PARKING_STATE['camera_id']})
- อัปเดตล่าสุด: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
- สรุปความพร้อม: ว่าง {avail_count} จากทั้งหมด {total_count} ช่อง (ช่องว่างได้แก่: {avail_str})
- รายละเอียดแต่ละช่อง:
{details}
- สถานะกล้อง Edge IoT: {CURRENT_PARKING_STATE['camera_health']}
- สภาพอากาศและสภาพแสง: {CURRENT_PARKING_STATE['weather']}
"""


def get_parking_records():
    """Retrieve list of parking status objects from Redis or PostgreSQL."""
    import json
    import redis

    # 1. Try Redis
    try:
        r_client = redis.Redis(
            host=settings.redis_host,
            port=settings.redis_port,
            decode_responses=True,
            socket_connect_timeout=0.5,
            socket_timeout=0.5,
        )
        cached = r_client.get("parking:status:summary")
        if cached:
            rows = json.loads(cached)
            if rows:
                return rows
    except Exception:
        pass

    # 2. Fallback to PostgreSQL
    from backend.db.database import SessionLocal
    from backend.app.models.parking_log import ParkStatusModel

    try:
        with SessionLocal() as db:
            rows = db.query(ParkStatusModel).order_by(ParkStatusModel.camera_id).all()
            if rows:
                return [
                    {
                        "camera_id": r.camera_id,
                        "location_name": r.location_name,
                        "vehicle_type": r.vehicle_type,
                        "total_capacity": r.total_capacity,
                        "occupied_count": r.occupied_count,
                        "vacant_count": r.vacant_count,
                        "occupancy_rate_pct": r.occupancy_rate_pct,
                        "status_level": r.status_level,
                        "available_slot_ids": r.available_slot_ids or [],
                        "slots_detail": r.slots_detail or [],
                        "updated_at": r.updated_at.strftime("%H:%M:%S") if r.updated_at else "",
                    }
                    for r in rows
                ]
    except Exception:
        pass
    return []


def build_quick_reply_payload():
    """Returns LINE Quick Reply buttons attached to message bottom."""
    return {
        "items": [
            {"type": "action", "action": {"type": "message", "label": "📊 สรุปรวม", "text": "📊 สรุปภาพรวม"}},
            {"type": "action", "action": {"type": "message", "label": "🚗 รถยนต์", "text": "🚗 หาที่จอดรถยนต์"}},
            {"type": "action", "action": {"type": "message", "label": "🛵 มอไซค์", "text": "🛵 หาที่จอดมอไซค์"}},
            {"type": "action", "action": {"type": "message", "label": "🏢 หน้าภาค 1", "text": "🏢 ลานหน้าภาค 1"}},
            {"type": "action", "action": {"type": "message", "label": "🅿️ ในร่ม 2", "text": "🅿️ ลานในร่มหน้าภาค 2"}},
            {"type": "action", "action": {"type": "message", "label": "🖥️ ข้างภาคคอม", "text": "🖥️ ลานข้างภาคคอม"}},
        ]
    }


def format_quick_response(user_msg: str) -> Optional[str]:
    """Provide instant, structured responses for Rich Menu and Quick Reply buttons."""
    msg = user_msg.strip()
    rows = get_parking_records()
    if not rows:
        return None

    # 1. Overview Summary (📊 สรุปภาพรวม)
    if "สรุป" in msg or "ภาพรวม" in msg or "overview" in msg.lower() or msg == "📊 สรุปภาพรวม":
        total_cap = sum(r.get("total_capacity", 0) for r in rows)
        total_vac = sum(r.get("vacant_count", 0) for r in rows)
        total_occ = sum(r.get("occupied_count", 0) for r in rows)
        overall_pct = round((total_occ / total_cap * 100) if total_cap > 0 else 0, 1)

        lines = [
            "🅿️ [สรุปสถานะที่จอดรถภาควิชาคอมพิวเตอร์]",
            f"⏱️ ข้อมูลสด Real-time AI Vision",
            f"━━━━━━━━━━━━━━━━━━━━",
            f"📊 ภาพรวมทั้งหมด: ว่าง {total_vac} / {total_cap} ช่อง ({overall_pct}% จอด)",
            "",
        ]
        for r in rows:
            cam = r.get("camera_id", "").upper()
            loc = r.get("location_name", cam)
            vac = r.get("vacant_count", 0)
            cap = r.get("total_capacity", 0)
            status = r.get("status_level", "AVAILABLE")
            status_emoji = "🟢" if status == "AVAILABLE" and vac > 0 else ("🟡" if status == "MODERATE" else "🔴")
            v_type_icon = "🚗" if r.get("vehicle_type") == "car" else ("🛵" if r.get("vehicle_type") == "motorcycle" else "🚗/🛵")

            lines.append(f"{status_emoji} {loc} ({cam}):")
            lines.append(f"   {v_type_icon} ว่าง {vac}/{cap} ช่อง (สถานะ: {status})")
            if r.get("available_slot_ids"):
                avail_sample = ", ".join(r.get("available_slot_ids")[:6])
                lines.append(f"   👉 ช่องว่าง: {avail_sample}")
            else:
                lines.append(f"   👉 ช่องว่าง: เต็มทุกช่อง")
            lines.append("")

        lines.append("💡 แตะปุ่มเมนูด้านล่างเพื่อดูเจาะจงรายโซนได้เลยครับ!")
        return "\n".join(lines)

    # 2. Car Only (🚗 หาที่จอดรถยนต์)
    if "รถยนต์" in msg or "car" in msg.lower() or msg == "🚗 หาที่จอดรถยนต์":
        car_rows = [r for r in rows if r.get("vehicle_type") in ("car", "mixed") or r.get("camera_id") in ("cam1", "cam2")]
        total_cap = sum(r.get("total_capacity", 0) for r in car_rows)
        total_vac = sum(r.get("vacant_count", 0) for r in car_rows)

        lines = [
            "🚗 [ค้นหาที่จอดรถยนต์ - Car Parking]",
            f"━━━━━━━━━━━━━━━━━━━━",
            f"📊 รถยนต์ว่างรวม: {total_vac} ช่อง",
            "",
        ]
        for r in car_rows:
            loc = r.get("location_name", r.get("camera_id", ""))
            vac = r.get("vacant_count", 0)
            cap = r.get("total_capacity", 0)
            status_emoji = "🟢" if vac >= 2 else ("🟡" if vac == 1 else "🔴")
            lines.append(f"{status_emoji} {loc}: ว่าง {vac}/{cap} ช่อง")
            if r.get("available_slot_ids"):
                lines.append(f"   👉 ช่องว่างแนะนำ: {', '.join(r.get('available_slot_ids'))}")
            else:
                lines.append(f"   👉 โซนนี้เต็มแล้วครับ")
            lines.append("")

        lines.append("💡 แนะนำ: กดปุ่มเลือกโซนเพื่อดูรายละเอียดช่องจอดได้ครับ")
        return "\n".join(lines)

    # 3. Motorcycle Only (🛵 หาที่จอดมอไซค์)
    if "มอไซ" in msg or "มอเตอร์ไซค์" in msg or "bike" in msg.lower() or msg == "🛵 หาที่จอดมอไซค์":
        bike_rows = [r for r in rows if r.get("vehicle_type") in ("motorcycle", "mixed") or r.get("camera_id") in ("cam3", "cam1", "cam2")]
        total_cap = sum(r.get("total_capacity", 0) for r in bike_rows)
        total_vac = sum(r.get("vacant_count", 0) for r in bike_rows)

        lines = [
            "🛵 [ค้นหาที่จอดมอเตอร์ไซค์ - Bike Parking]",
            f"━━━━━━━━━━━━━━━━━━━━",
            f"📊 มอเตอร์ไซค์ว่างรวม: {total_vac} ช่อง",
            "",
        ]
        for r in bike_rows:
            loc = r.get("location_name", r.get("camera_id", ""))
            vac = r.get("vacant_count", 0)
            cap = r.get("total_capacity", 0)
            status_emoji = "🟢" if vac >= 3 else ("🟡" if vac >= 1 else "🔴")
            lines.append(f"{status_emoji} {loc}: ว่าง {vac}/{cap} ช่อง")
            if r.get("available_slot_ids"):
                avail_preview = ", ".join(r.get("available_slot_ids")[:8])
                if len(r.get("available_slot_ids")) > 8:
                    avail_preview += f" และอีก {len(r.get('available_slot_ids')) - 8} ช่อง"
                lines.append(f"   👉 ช่องว่าง: {avail_preview}")
            else:
                lines.append(f"   👉 โซนนี้เต็มแล้วครับ")
            lines.append("")

        lines.append("💡 โซนข้างภาคคอม (CAM-03) เป็นลานจอดมอไซค์หลักครับ")
        return "\n".join(lines)

    # 4. Specific Camera Zones
    target_cam = None
    if "หน้าภาค 1" in msg or "cam1" in msg.lower() or "zone a" in msg.lower():
        target_cam = "cam1"
    elif "ในร่ม" in msg or "หน้าภาค 2" in msg or "cam2" in msg.lower() or "zone b" in msg.lower():
        target_cam = "cam2"
    elif "ข้างภาค" in msg or "ข้างภาคคอม" in msg or "cam3" in msg.lower() or "zone c" in msg.lower():
        target_cam = "cam3"

    if target_cam:
        match = next((r for r in rows if r.get("camera_id") == target_cam), None)
        if match:
            loc = match.get("location_name", target_cam.upper())
            vac = match.get("vacant_count", 0)
            cap = match.get("total_capacity", 0)
            occ = match.get("occupied_count", 0)
            pct = match.get("occupancy_rate_pct", 0)
            status = match.get("status_level", "AVAILABLE")
            status_emoji = "🟢" if vac > 0 else "🔴"

            lines = [
                f"📍 [{loc} - กล้อง {target_cam.upper()}]",
                f"━━━━━━━━━━━━━━━━━━━━",
                f"สถานะ: {status_emoji} {status} (อัตราการจอด {pct}%)",
                f"ความจุ: ว่าง {vac} ช่อง / ทั้งหมด {cap} ช่อง (จอดแล้ว {occ} คัน)",
                "",
                "📋 รายละเอียดช่องจอด:",
            ]
            for s in (match.get("slots_detail") or []):
                s_id = s.get("id")
                is_occ = s.get("occupied")
                s_icon = "🔴" if is_occ else "🟢"
                s_txt = s.get("vehicle_name") or ("ไม่ว่าง" if is_occ else "ว่างพร้อมจอด")
                lines.append(f"  {s_icon} ช่อง {s_id}: {s_txt}")

            return "\n".join(lines)

    return None


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
    """Manages LINE Bot webhooks, message replies, and dotBlue LLM orchestration."""

    def __init__(self):
        self.channel_secret = settings.line_channel_secret
        self.access_token = settings.line_channel_access_token

    def query_dotblue_advisor(self, user_question: str) -> str:
        """Call dotBlue API (OpenAI Compatible) with openai/gpt-5.6-luna."""
        parking_context = get_current_parking_summary()

        system_prompt = f"""คุณคือ "น้องจ๊อด หาที่จอดรถ" บอตผู้ช่วยอัจฉริยะประจำลานจอดรถภาควิชาวิศวกรรมคอมพิวเตอร์ คณะวิศวกรรมศาสตร์ มหาวิทยาลัยสงขลานครินทร์ (ม.อ.)
บุคลิก: สุภาพ ร่าเริง ให้ข้อมูลกระชับ ชัดเจน ตอบคำถามตรงจุด และใช้ภาษาไทยทางการและสุภาพ (ลงท้ายด้วย ครับ)

{parking_context}

คำแนะนำในการตอบคำถาม:
1. หากผู้ใช้ถามว่า "มีที่จอดว่างไหม" หรือถามถึงช่องจอด: ให้บอกจำนวนช่องว่างทันที และระบุชื่อช่องที่ว่าง (เช่น A03 หรือ A05) อย่างชัดเจน
2. หากผู้ใช้ถามถึงโอกาสว่างเมื่อมาถึงในอนาคต (เช่น อีก 10-15 นาที): ให้วิเคราะห์ความน่าจะเป็น เช่น "ช่อง A03 มีโอกาสว่างสูง ~80% เนื่องจากเพิ่งว่างได้ไม่นาน แนะนำให้รีบมาจอดครับ"
3. หากผู้ใช้ถามเรื่องระบบหรือกล้อง: สามารถอธิบายได้ว่าเป็นระบบ Edge AI ใช้กล้อง ESP32-CAM ตรวจจับช่องจอดด้วย AI
4. ห้ามแต่งข้อมูลช่องจอดนอกเหนือจากที่ระบุในข้อมูลสถานะด้านบนเด็ดขาด
5. คำตอบควรมีความยาวพอเหมาะสำหรับอ่านในแชต LINE (ไม่ยาวจนเกินไป)"""

        payload = {
            "model": settings.dotblue_model or "openai/gpt-5.6-luna",
            "stream": False,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_question},
            ],
            "temperature": 0.4,
            "max_tokens": 400,
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
            avail_slots = ", ".join(CURRENT_PARKING_STATE["available_slots"])
            return f"ขออภัยครับ ระบบ AI เกิดขัดข้องชั่วคราว แต่สถานะล่าสุดขณะนี้มีช่องว่าง {len(CURRENT_PARKING_STATE['available_slots'])} ช่อง ได้แก่ [{avail_slots}] ครับ"

    def handle_webhook_event(self, body: str, signature: str):
        """Process LINE webhook event payload and verify signature."""
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

                # 1. Fast Check: Rich Menu Button / Predefined Action
                fast_reply = format_quick_response(user_msg)
                if fast_reply:
                    final_text = fast_reply
                else:
                    # 2. Conversational fallback: Query dotBlue AI for intelligent response
                    final_text = self.query_dotblue_advisor(user_msg)

                # Reply back to LINE user directly with Quick Reply options attached
                reply_url = "https://api.line.me/v2/bot/message/reply"
                reply_headers = {
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.access_token}",
                }
                reply_payload = {
                    "replyToken": reply_token,
                    "messages": [
                        {
                            "type": "text",
                            "text": final_text,
                            "quickReply": build_quick_reply_payload()
                        }
                    ],
                }
                try:
                    reply_req = urllib.request.Request(
                        reply_url,
                        data=json.dumps(reply_payload).encode("utf-8"),
                        headers=reply_headers,
                    )
                    with urllib.request.urlopen(reply_req, context=_ssl_ctx, timeout=10) as r_resp:
                        logger.info("LINE reply sent successfully with QuickReply, HTTP %s", r_resp.status)
                except Exception as line_err:
                    logger.error("Failed to send LINE reply: %s", line_err)


line_bot_service = LineBotService()



