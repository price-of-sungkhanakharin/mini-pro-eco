"""LINE Chatbot Webhook Router."""

import logging
from typing import Any, Dict

from fastapi import APIRouter, Header, HTTPException, Request

from backend.app.core.config import settings
from backend.app.services.line_bot_service import (
    CURRENT_PARKING_STATE,
    InvalidSignatureError,
    line_bot_service,
    get_public_https_url,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["LINE Chatbot"])


@router.post(
    "/api/v1/line/webhook",
    summary="LINE Messaging API Webhook",
    description="Receives events from LINE Messaging API, verifies signature, and replies with Quick Reply buttons and live parking snapshots.",
    responses={
        200: {"description": "Webhook event handled successfully"},
        400: {"description": "Missing or invalid signature"},
    },
)
@router.post("/line/webhook", include_in_schema=False)
async def line_webhook(
    request: Request,
    x_line_signature: str = Header(None, alias="X-Line-Signature"),
):
    """Handle incoming Webhook events from LINE."""
    if not x_line_signature:
        logger.warning("Missing X-Line-Signature header in LINE webhook request")
        raise HTTPException(status_code=400, detail="Missing X-Line-Signature header")

    body_bytes = await request.body()
    body_str = body_bytes.decode("utf-8")

    try:
        line_bot_service.handle_webhook_event(body_str, x_line_signature)
    except InvalidSignatureError:
        logger.warning("Invalid LINE Webhook Signature rejected")
        raise HTTPException(status_code=400, detail="Invalid signature")
    except Exception as e:
        logger.error("Error processing LINE webhook event: %s", e)
        # LINE requires 200 even if handling failed internally to prevent re-delivery flood
        return {"status": "error", "message": str(e)}

    return {"status": "ok"}


@router.get(
    "/api/v1/line/status",
    summary="Get LINE Bot Status & Parking Summary",
    description="Check the current parking occupancy context and bot status.",
)
def get_bot_status() -> Dict[str, Any]:
    """Return the current active parking state used by the bot."""
    return {
        "bot_name": "น้องจ๊อด หาที่จอดรถ",
        "bot_id": "@422ubvyc",
        "mode": "rule_based_quick_reply",
        "current_state": CURRENT_PARKING_STATE,
    }


@router.get(
    "/api/v1/line/config",
    summary="Get LINE Bot Configuration & Connection Status",
    description="Returns public webhook URL, channel tokens, bot profile and connection status for the setup UI.",
)
def get_line_config() -> Dict[str, Any]:
    """Return LINE Messaging API credentials and webhook info for setup."""
    public_base = get_public_https_url()
    secret = settings.line_channel_secret or ""
    token = settings.line_channel_access_token or ""
    masked_secret = f"{secret[:6]}...{secret[-4:]}" if len(secret) > 10 else ("Configured" if secret else "Not configured")
    masked_token = f"{token[:12]}...{token[-6:]}" if len(token) > 18 else ("Configured" if token else "Not configured")
    
    return {
        "bot_name": "น้องจ๊อด หาที่จอดรถ",
        "bot_id": "@422ubvyc",
        "channel_id": settings.line_channel_id or "2011743452",
        "channel_secret": secret,
        "channel_secret_masked": masked_secret,
        "channel_access_token": token,
        "channel_access_token_masked": masked_token,
        "public_base_url": public_base,
        "webhook_url": f"{public_base}/api/v1/line/webhook",
        "local_webhook_url": "http://172.30.228.51:8000/api/v1/line/webhook",
        "is_connected": bool(secret and token),
        "mode": "rule_based_quick_reply",
        "rich_menu_active": True,
        "rich_menu_id": "richmenu-e2c4a61d9f3b0b1246e4ce1ab834b52a",
        "add_friend_url": "https://line.me/R/ti/p/@422ubvyc"
    }


@router.post(
    "/api/v1/line/test-query",
    summary="Simulate user question or button click to LINE Bot",
    description="Allows testing the bot's responses and snapshot attachments directly via REST API without sending a message in LINE.",
)
async def test_bot_query(payload: Dict[str, str]):
    """Test quick response or default fallback directly."""
    question = payload.get("question", "ตอนนี้มีที่จอดรถว่างไหม")
    from backend.app.services.line_bot_service import format_quick_response, format_default_fallback_response
    fast_reply, target_cams, vehicle_filter = format_quick_response(question)
    if fast_reply:
        answer = fast_reply
        mode = "quick_reply"
    else:
        answer, target_cams, vehicle_filter = format_default_fallback_response()
        mode = "fallback_menu"

    v_param = f"&vehicle_type={vehicle_filter}" if vehicle_filter else ""
    image_urls = [f"/api/v1/line/snapshot/{cam}?mode=chatbot{v_param}" for cam in target_cams]

    return {
        "question": question,
        "answer": answer,
        "handler": mode,
        "target_cams": target_cams,
        "vehicle_filter": vehicle_filter,
        "image_urls": image_urls,
    }


from fastapi.responses import FileResponse
import os
import sys
from pathlib import Path

if "/home/r211admin/parking-detect" not in sys.path:
    sys.path.append("/home/r211admin/parking-detect")
try:
    from overlay_generator import get_parking_snapshot
except Exception as _e:
    logger.warning("Could not import get_parking_snapshot: %s", _e)
    get_parking_snapshot = None


@router.get(
    "/api/v1/line/snapshot/{cam_id}",
    summary="Get real-time parking overlay image for camera",
    description="Generates and serves the latest parking overlay image (chatbot, dashboard, or raw) for the camera."
)
def get_camera_snapshot(cam_id: str, mode: str = "chatbot", vehicle_type: str = None, type: str = None):
    """Serve fresh real-time parking overlay image for LINE / web consumers."""
    cam_clean = cam_id.lower().strip()
    v_type = vehicle_type or type
    if v_type:
        v_type = v_type.lower().strip()
        if v_type in ("bike", "motorcycle", "moto", "มอไซ", "มอเตอร์ไซค์", "2wheel", "2ล้อ"):
            v_type = "motorcycle"
        elif v_type in ("car", "truck", "bus", "auto", "รถยนต์", "4wheel", "4ล้อ"):
            v_type = "car"
        else:
            v_type = None

    # 1. Try dynamic generator if available
    if get_parking_snapshot is not None:
        try:
            img_file = get_parking_snapshot(cam_id=cam_clean, mode=mode, vehicle_type=v_type)
            if img_file and os.path.exists(img_file):
                return FileResponse(img_file, media_type="image/jpeg")
        except Exception as e:
            logger.warning("Dynamic snapshot generation error for %s: %s", cam_clean, e)

    # 2. Fallback to cached static snapshot files
    candidate_paths = []
    if mode == "chatbot":
        if v_type:
            candidate_paths.extend([
                Path(f"/app/data/snapshots/{cam_clean}_chatbot_{v_type}.jpg"),
                Path(f"/home/r211admin/project-eco/ai-ecosystem-workspace/data/snapshots/{cam_clean}_chatbot_{v_type}.jpg"),
                Path(f"/home/r211admin/parking-detect/status_overlay/{cam_clean}_chatbot_{v_type}.jpg"),
            ])
        candidate_paths.extend([
            Path(f"/app/data/snapshots/{cam_clean}_chatbot_latest.jpg"),
            Path(f"/home/r211admin/project-eco/ai-ecosystem-workspace/data/snapshots/{cam_clean}_chatbot_latest.jpg"),
            Path(f"/home/r211admin/parking-detect/status_overlay/{cam_clean}_chatbot_latest.jpg"),
        ])
    else:
        candidate_paths.extend([
            Path(f"/app/data/snapshots/{cam_clean}_detected.jpg"),
            Path(f"/home/r211admin/project-eco/ai-ecosystem-workspace/data/snapshots/{cam_clean}_detected.jpg"),
            Path(f"/home/r211admin/project-eco/ai-ecosystem-workspace/frontend/public/{cam_clean}_detected.jpg"),
            Path(f"/home/r211admin/parking-detect/status_overlay/{cam_clean}_dashboard_overlay.jpg"),
        ])
    cache_headers = {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
    }
    for p in candidate_paths:
        if p.exists():
            return FileResponse(str(p), media_type="image/jpeg", headers=cache_headers)

    raise HTTPException(status_code=404, detail=f"No snapshot available for camera {cam_clean}")


