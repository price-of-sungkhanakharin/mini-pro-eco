"""LINE Chatbot & dotBlue AI Advisor Service.

Integrates LINE Messaging API webhook with dotBlue OpenAI-compatible LLM
(openai/gpt-5.6-luna) to answer user inquiries about parking status in real time.
"""

import json
import logging
import ssl
import urllib.request
from datetime import datetime
from typing import Any, Dict, List, Optional

try:
    from linebot.v3 import WebhookHandler
    from linebot.v3.exceptions import InvalidSignatureError
    from linebot.v3.messaging import (
        ApiClient,
        Configuration,
        FlexBubble,
        FlexBox,
        FlexButton,
        FlexComponent,
        FlexContainer,
        FlexMessage,
        FlexText,
        MessagingApi,
        ReplyMessageRequest,
        TextMessage,
        URIAction,
    )
    from linebot.v3.webhooks import MessageEvent, TextMessageContent
    HAS_LINEBOT = True
except ImportError:
    HAS_LINEBOT = False
    class InvalidSignatureError(Exception):
        pass
    WebhookHandler = None
    ApiClient = None
    Configuration = None
    FlexBubble = None
    FlexBox = None
    FlexButton = None
    FlexComponent = None
    FlexContainer = None
    FlexMessage = None
    FlexText = None
    MessagingApi = None
    ReplyMessageRequest = None
    TextMessage = None
    URIAction = None
    MessageEvent = None
    TextMessageContent = None

from backend.app.core.config import settings

logger = logging.getLogger(__name__)

# SSL context for dotBlue API request
_ssl_ctx = ssl.create_default_context()
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
    """Format the current parking occupancy into a readable context for the AI."""
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


class LineBotService:
    """Manages LINE Bot webhooks, message replies, and dotBlue LLM orchestration."""

    def __init__(self):
        self.channel_secret = settings.line_channel_secret
        self.access_token = settings.line_channel_access_token
        self.handler = WebhookHandler(self.channel_secret) if (HAS_LINEBOT and self.channel_secret and WebhookHandler) else None
        self.config = Configuration(access_token=self.access_token) if (HAS_LINEBOT and self.access_token and Configuration) else None

    def query_dotblue_advisor(self, user_question: str) -> str:
        """Call dotBlue API (OpenAI Compatible) with openai/gpt-5.6-luna."""
        parking_context = get_current_parking_summary()

        system_prompt = f"""คุณคือ "น้องจ๊อด หาที่จอดรถ" บอตผู้ช่วยอัจฉริยะประจำลานจอดรถภาควิชาวิศวกรรมคอมพิวเตอร์ คณะวิศวกรรมศาสตร์ มหาวิทยาลัยสงขลานครินทร์ (ม.อ.)
บุคลิก: สุภาพ ร่าเริง ให้ข้อมูลกระชับ ชัดเจน ตอบคำถามตรงจุด และใช้ภาษาไทยเป็นมิตร (ลงท้ายด้วย ครับ/จ้า หรือ อิโมจิที่เหมาะสม 🚗🅿️)

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
            return f"ขออภัยครับ ระบบ AI เกิดขัดข้องชั่วคราว ⚠️ แต่สถานะล่าสุดขณะนี้มีช่องว่าง {len(CURRENT_PARKING_STATE['available_slots'])} ช่อง ได้แก่ [{avail_slots}] ครับ 🚗"

    def handle_webhook_event(self, body: str, signature: str):
        """Process LINE webhook event payload and verify signature."""
        if not self.handler:
            raise ValueError("LINE Channel Secret is not configured.")

        # Register message handler inside
        @self.handler.add(MessageEvent, message=TextMessageContent)
        def handle_text(event):
            user_msg = event.message.text.strip()
            logger.info("Received LINE message: '%s' from user: %s", user_msg, event.source.user_id)

            # Query dotBlue AI for intelligent response
            ai_reply = self.query_dotblue_advisor(user_msg)

            # Reply back to LINE user directly using SSL-resilient urllib request
            reply_url = "https://api.line.me/v2/bot/message/reply"
            reply_headers = {
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.access_token}",
            }
            reply_payload = {
                "replyToken": event.reply_token,
                "messages": [
                    {"type": "text", "text": ai_reply}
                ],
            }
            try:
                reply_req = urllib.request.Request(
                    reply_url,
                    data=json.dumps(reply_payload).encode("utf-8"),
                    headers=reply_headers,
                )
                with urllib.request.urlopen(reply_req, context=_ssl_ctx, timeout=10) as r_resp:
                    logger.info("LINE reply sent successfully, HTTP %s", r_resp.status)
            except Exception as line_err:
                logger.error("Failed to send LINE reply: %s", line_err)

        try:
            self.handler.handle(body, signature)
        except InvalidSignatureError as err:
            logger.warning("Invalid LINE webhook signature: %s", err)
            raise


line_bot_service = LineBotService()

