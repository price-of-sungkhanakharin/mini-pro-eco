"""LINE Chatbot Webhook Router."""

import logging
from typing import Any, Dict

from fastapi import APIRouter, Header, HTTPException, Request

from backend.app.services.line_bot_service import (
    CURRENT_PARKING_STATE,
    InvalidSignatureError,
    line_bot_service,
)

logger = logging.getLogger(__name__)

router = APIRouter(tags=["LINE Chatbot"])


@router.post(
    "/api/v1/line/webhook",
    summary="LINE Messaging API Webhook",
    description="Receives events from LINE Messaging API, verifies signature, and replies using dotBlue AI.",
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
    description="Check the current parking occupancy context that the LINE Bot feeds to dotBlue AI.",
)
def get_bot_status() -> Dict[str, Any]:
    """Return the current active parking state used by the bot."""
    return {
        "bot_name": "น้องจ๊อด หาที่จอดรถ",
        "bot_id": "@422ubvyc",
        "model": "openai/gpt-5.6-luna",
        "endpoint": "https://ai.psu.blue/v1",
        "current_state": CURRENT_PARKING_STATE,
    }


@router.post(
    "/api/v1/line/test-query",
    summary="Simulate user question to dotBlue AI / Quick Reply",
    description="Allows testing the bot's responses and snapshot attachments directly via REST API without sending a message in LINE.",
)
async def test_bot_query(payload: Dict[str, str]):
    """Test AI query response or quick response directly."""
    question = payload.get("question", "ตอนนี้มีที่จอดรถว่างไหม")
    from backend.app.services.line_bot_service import format_quick_response
    fast_reply, target_cams = format_quick_response(question)
    if fast_reply:
        answer = fast_reply
        mode = "quick_reply"
    else:
        answer = line_bot_service.query_dotblue_advisor(question)
        mode = "dotblue_ai"
        target_cams = []

    image_urls = [f"/api/v1/line/snapshot/{cam}?mode=chatbot" for cam in target_cams]

    return {
        "question": question,
        "answer": answer,
        "handler": mode,
        "target_cams": target_cams,
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
def get_camera_snapshot(cam_id: str, mode: str = "chatbot"):
    """Serve fresh real-time parking overlay image for LINE / web consumers."""
    cam_clean = cam_id.lower().strip()
    
    # 1. Try dynamic generator if available
    if get_parking_snapshot is not None:
        try:
            img_file = get_parking_snapshot(cam_id=cam_clean, mode=mode)
            if img_file and os.path.exists(img_file):
                return FileResponse(img_file, media_type="image/jpeg")
        except Exception as e:
            logger.warning("Dynamic snapshot generation error for %s: %s", cam_clean, e)

    # 2. Fallback to cached static snapshot files
    candidate_paths = [
        Path(f"/app/data/snapshots/{cam_clean}_chatbot_latest.jpg"),
        Path(f"/app/data/snapshots/{cam_clean}_detected.jpg"),
        Path(f"/app/data/snapshots/{cam_clean}_{mode}_latest.jpg"),
        Path(f"/home/r211admin/project-eco/ai-ecosystem-workspace/data/snapshots/{cam_clean}_chatbot_latest.jpg"),
        Path(f"/home/r211admin/project-eco/ai-ecosystem-workspace/data/snapshots/{cam_clean}_detected.jpg"),
        Path(f"/home/r211admin/project-eco/ai-ecosystem-workspace/frontend/public/{cam_clean}_detected.jpg"),
        Path(f"/home/r211admin/parking-detect/status_overlay/{cam_clean}_{mode}_latest.jpg"),
        Path(f"/home/r211admin/parking-detect/status_overlay/{cam_clean}_chatbot_latest.jpg"),
    ]
    cache_headers = {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
    }
    for p in candidate_paths:
        if p.exists():
            return FileResponse(str(p), media_type="image/jpeg", headers=cache_headers)

    raise HTTPException(status_code=404, detail=f"No snapshot available for camera {cam_clean}")


