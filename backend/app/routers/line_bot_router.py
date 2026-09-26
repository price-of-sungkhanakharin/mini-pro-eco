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
    summary="Simulate user question to dotBlue AI",
    description="Allows testing the bot's AI reasoning directly via REST API without sending a message in LINE.",
)
async def test_bot_query(payload: Dict[str, str]):
    """Test AI query response directly."""
    question = payload.get("question", "ตอนนี้มีที่จอดรถว่างไหม")
    answer = line_bot_service.query_dotblue_advisor(question)
    return {
        "question": question,
        "answer": answer,
        "model": "openai/gpt-5.6-luna",
    }
