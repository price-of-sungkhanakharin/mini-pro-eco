#!/usr/bin/env python3
"""Standalone CLI Auto-Label Continuous Streamer Service.

Continuously processes unlabeled CCTV images in micro-batches (e.g. 20 images at a time)
- Sends to Private GPU Node (http://172.30.81.175:9000) for YOLO26x CPU inference
- Ingests into Label Studio (http://localhost:8080) with pre-drawn bounding boxes
- Loops continuously until the queue is drained, then re-scans MinIO
- Strictly requires human review (no auto-approval)
"""

import asyncio
import os
from pathlib import Path
import signal
import sys

BASE_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = BASE_DIR / "backend"
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from backend.app.services.autolabel_stream_service import autolabel_stream_manager
from backend.app.utils.logger import logger

stop_event = asyncio.Event()


def handle_shutdown(sig, frame):
    logger.info("Received termination signal. Gracefully shutting down Auto-Label Streamer...")
    autolabel_stream_manager.stop_background_worker()
    stop_event.set()


async def main():
    signal.signal(signal.SIGINT, handle_shutdown)
    signal.signal(signal.SIGTERM, handle_shutdown)

    logger.info("Starting Auto-Label Continuous Streamer CLI...")
    autolabel_stream_manager.start_background_worker()

    while not stop_event.is_set():
        status = autolabel_stream_manager.get_status()
        logger.info(f"[Streamer Status] {status['status_message']}")
        await asyncio.sleep(10.0)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        logger.info("Auto-Label Streamer CLI stopped.")
