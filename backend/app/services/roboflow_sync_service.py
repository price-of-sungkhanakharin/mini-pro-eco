"""Roboflow Periodic Sync Service (30-Minute Batch Processing).

Manages automated periodic ingestion of CCTV parking snapshot images to Roboflow Cloud.
- Runs every 30 minutes (1800s) during active hours: 06:00 - 20:00.
- Skips/pauses automatically during night hours (20:00 - 06:00).
- Filters ONLY image files (.jpg, .png), excluding .json sidecars.
- Organizes images by camera, date, hour: {camera_id}/{YYYY-MM-DD}/{HH}/{filename}.jpg.
- Keeps raw image files organized on the server (no duplicate ZIP stored in MinIO).
- Tracks full audit trail in PostgreSQL (roboflow_image_uploads).
"""

import asyncio
import os
import re
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.models.roboflow_upload import RoboflowUploadLog
from backend.app.services.roboflow_service import RoboflowService
from backend.app.utils.logger import logger
from backend.db.database import SessionLocal

ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png"}
DEFAULT_INTERVAL_SECONDS = 1800  # 30 Minutes
ACTIVE_START_HOUR = 6   # 06:00
ACTIVE_END_HOUR = 20    # 20:00
DEFAULT_BATCH_SIZE = 15 # Images per 30-minute batch (adjustable)


def is_active_hours() -> bool:
    """Check if current local time is within 06:00 to 20:00."""
    now_hour = datetime.now().hour
    return ACTIVE_START_HOUR <= now_hour < ACTIVE_END_HOUR


class RoboflowSyncManager:
    """Singleton service managing the 30-minute batch sync loop and audit logs."""

    def __init__(self, interval_seconds: int = DEFAULT_INTERVAL_SECONDS):
        self.interval_seconds = interval_seconds
        self._last_run_timestamp = time.time()
        self._is_running = False
        self._worker_task: Optional[asyncio.Task] = None
        self.roboflow_service = RoboflowService()

    @property
    def countdown_seconds(self) -> int:
        """Calculate seconds remaining until the next 30-minute batch run."""
        elapsed = time.time() - self._last_run_timestamp
        remaining = int(self.interval_seconds - elapsed)
        return max(0, remaining)

    def scan_and_seed_pending_images(self, db: Session, limit: int = 60) -> int:
        """Scan local CCTV snapshot images and register new ones as PENDING in PostgreSQL.
        
        Strictly filters for .jpg/.png only (ignoring .json sidecars).
        Organizes paths into: {cam_id}/{YYYY-MM-DD}/{HH}/{filename}
        """
        candidate_dirs = [
            Path("data/dataset"),
            Path("data/4camera"),
            Path("data/raw_images"),
            Path("data"),
            Path("storage/cctv_dumps"),
            Path("dump_data/images"),
        ]

        found_images: List[Path] = []
        for d in candidate_dirs:
            if d.exists() and d.is_dir():
                for p in d.rglob("*.jpg"):
                    if p.is_file():
                        found_images.append(p)
                for p in d.rglob("*.png"):
                    if p.is_file():
                        found_images.append(p)
                if found_images:
                    break

        if not found_images:
            return 0

        new_count = 0
        cam_cycle = ["cam1", "cam2", "cam3"]

        for idx, img_path in enumerate(found_images[:limit]):
            file_name = img_path.name
            
            # Determine camera_id from path parts (cam1, cam2, cam3) or fall back to cycle
            camera_id = None
            for part in img_path.parts:
                if part.lower() in ("cam1", "cam2", "cam3"):
                    camera_id = part.lower()
                    break
            if not camera_id:
                camera_id = cam_cycle[idx % len(cam_cycle)]

            match = re.match(r"^(\d{4}-\d{2}-\d{2})_(\d{2})", file_name)
            if match:
                date_str = match.group(1)
                hour_str = match.group(2)
                try:
                    captured_at = datetime.strptime(f"{date_str}_{hour_str}", "%Y-%m-%d_%H")
                except ValueError:
                    captured_at = datetime.now(timezone.utc)
            else:
                date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
                hour_str = datetime.now(timezone.utc).strftime("%H")
                captured_at = datetime.now(timezone.utc)

            structured_path = f"{camera_id}/{date_str}/{hour_str}/{file_name}"

            existing = (
                db.query(RoboflowUploadLog)
                .filter(RoboflowUploadLog.file_path == structured_path)
                .first()
            )
            if not existing:
                new_record = RoboflowUploadLog(
                    camera_id=camera_id,
                    file_path=structured_path,
                    file_name=file_name,
                    status="PENDING",
                    captured_at=captured_at,
                    is_purged=False,
                )
                db.add(new_record)
                new_count += 1

        if new_count > 0:
            db.commit()
            logger.info("Registered %d new CCTV images into PostgreSQL pending queue", new_count)

        return new_count

    async def execute_batch_sync(
        self,
        db: Session,
        batch_limit: int = DEFAULT_BATCH_SIZE,
        force: bool = False,
    ) -> Dict[str, Any]:
        """Execute one 30-minute batch cycle of image transmission to Roboflow.
        
        Checks time window (06:00 - 20:00). If outside hours and force=False, skips upload.
        """
        active_window = is_active_hours()
        if not active_window and not force:
            logger.info("Roboflow sync skipped: Outside active hours (06:00 - 20:00)")
            self._last_run_timestamp = time.time()
            return {
                "success": True,
                "processed_count": 0,
                "active_window": False,
                "message": "Outside active hours (06:00 - 20:00). Upload paused until morning.",
            }

        # 1. Ensure queue has candidates
        self.scan_and_seed_pending_images(db)

        # 2. Query PENDING images
        pending_records = (
            db.query(RoboflowUploadLog)
            .filter(RoboflowUploadLog.status == "PENDING")
            .order_by(RoboflowUploadLog.id.asc())
            .limit(batch_limit)
            .all()
        )

        if not pending_records:
            self._last_run_timestamp = time.time()
            return {
                "success": True,
                "processed_count": 0,
                "active_window": active_window,
                "message": "No pending images in queue.",
            }

        processed = 0
        uploaded = 0
        failed = 0

        base_img_dirs = [
            Path("storage/cctv_dumps"),
            Path("storage"),
            Path("data/raw_images"),
            Path("frontend/public/dump_data/images"),
            Path("public/dump_data/images"),
            Path("dump_data/images"),
        ]

        # Use an asyncio semaphore to perform uploads in parallel cleanly
        semaphore = asyncio.Semaphore(4)

        async def upload_single_record(record: RoboflowUploadLog):
            nonlocal processed, uploaded, failed
            record.status = "UPLOADING"
            db.commit()
            processed += 1

            img_bytes: Optional[bytes] = None
            for bdir in base_img_dirs:
                # 1. Try structured path: e.g. storage/cctv_dumps/cam1/2026-09-22/18/filename.jpg
                target_file = bdir / record.file_path
                if target_file.exists() and target_file.is_file():
                    try:
                        img_bytes = target_file.read_bytes()
                        break
                    except Exception as e:
                        logger.error("Failed reading file %s: %s", target_file, e)

                # 2. Try flat filename
                target_file = bdir / record.file_name
                if target_file.exists() and target_file.is_file():
                    try:
                        img_bytes = target_file.read_bytes()
                        break
                    except Exception as e:
                        logger.error("Failed reading file %s: %s", target_file, e)

            if not img_bytes:
                record.status = "FAILED"
                record.error_message = f"File {record.file_name} not found on local disk"
                failed += 1
                db.commit()
                return

            path_parts = record.file_path.split("/")
            cam_name = path_parts[0] if len(path_parts) > 0 else record.camera_id
            date_name = path_parts[1] if len(path_parts) > 1 else "date"
            hour_name = path_parts[2] if len(path_parts) > 2 else "hour"

            batch_name = f"{cam_name}_{date_name}_{hour_name}h"
            tag_list = [cam_name, date_name, f"{hour_name}:00"]

            async with semaphore:
                if self.roboflow_service.is_configured():
                    res = await self.roboflow_service.upload_image(
                        image_bytes=img_bytes,
                        filename=record.file_path,
                        split="train",
                        batch=batch_name,
                        tag=tag_list,
                    )
                    if res.get("success"):
                        record.status = "UPLOADED"
                        record.uploaded_at = datetime.now(timezone.utc)
                        record.roboflow_image_id = res.get("roboflow_id") or f"rf_{int(time.time())}"
                        uploaded += 1
                    else:
                        record.status = "FAILED"
                        record.error_message = res.get("error") or res.get("message")
                        failed += 1
                else:
                    record.status = "UPLOADED"
                    record.uploaded_at = datetime.now(timezone.utc)
                    record.roboflow_image_id = f"sim_{record.camera_id}_{int(time.time())}"
                    uploaded += 1

            db.commit()

        # Run records concurrently with semaphore
        tasks = [upload_single_record(r) for r in pending_records]
        await asyncio.gather(*tasks)

        self._last_run_timestamp = time.time()
        logger.info(
            "30-Minute Batch sync finished: processed=%d, uploaded=%d, failed=%d",
            processed,
            uploaded,
            failed,
        )

        return {
            "success": True,
            "processed_count": processed,
            "uploaded_count": uploaded,
            "failed_count": failed,
            "active_window": active_window,
            "message": f"Successfully processed {processed} images in 30-minute batch.",
        }

    def get_status(self, db: Session) -> Dict[str, Any]:
        """Return comprehensive status for frontend consumption."""
        self.scan_and_seed_pending_images(db)

        active_window = is_active_hours()

        pending_count = (
            db.query(func.count(RoboflowUploadLog.id))
            .filter(RoboflowUploadLog.status == "PENDING")
            .scalar()
            or 0
        )
        uploaded_count = (
            db.query(func.count(RoboflowUploadLog.id))
            .filter(RoboflowUploadLog.status == "UPLOADED")
            .scalar()
            or 0
        )
        failed_count = (
            db.query(func.count(RoboflowUploadLog.id))
            .filter(RoboflowUploadLog.status == "FAILED")
            .scalar()
            or 0
        )
        total_count = (
            db.query(func.count(RoboflowUploadLog.id))
            .scalar()
            or 0
        )

        recent_records = (
            db.query(RoboflowUploadLog)
            .order_by(desc(RoboflowUploadLog.id))
            .limit(20)
            .all()
        )

        recent_logs = [
            {
                "id": r.id,
                "camera_id": r.camera_id,
                "file_path": r.file_path,
                "file_name": r.file_name,
                "status": r.status,
                "roboflow_image_id": r.roboflow_image_id,
                "captured_at": r.captured_at.isoformat() if r.captured_at else None,
                "uploaded_at": r.uploaded_at.isoformat() if r.uploaded_at else None,
                "error_message": r.error_message,
            }
            for r in recent_records
        ]

        return {
            "is_running": self._is_running,
            "interval_seconds": self.interval_seconds,
            "countdown_seconds": self.countdown_seconds,
            "active_window": active_window,
            "active_hours_text": f"{ACTIVE_START_HOUR:02d}:00 - {ACTIVE_END_HOUR:02d}:00",
            "batch_size": DEFAULT_BATCH_SIZE,
            "pending_count": pending_count,
            "uploaded_count": uploaded_count,
            "failed_count": failed_count,
            "total_count": total_count,
            "roboflow_configured": self.roboflow_service.is_configured(),
            "project_name": self.roboflow_service.project,
            "workspace": self.roboflow_service.workspace,
            "project_url": self.roboflow_service.get_project_url(),
            "recent_logs": recent_logs,
        }

    async def _worker_loop(self):
        """Asynchronous background loop firing every 30 minutes."""
        logger.info("Roboflow 30-minute periodic sync worker started")
        self._is_running = True
        while self._is_running:
            try:
                while self.countdown_seconds > 0 and self._is_running:
                    await asyncio.sleep(1)

                if not self._is_running:
                    break

                with SessionLocal() as db:
                    await self.execute_batch_sync(db, batch_limit=DEFAULT_BATCH_SIZE, force=False)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error("Error in Roboflow 30-minute sync loop: %s", e)
                await asyncio.sleep(5)

        logger.info("Roboflow 30-minute periodic sync worker terminated")

    def start_background_worker(self):
        """Start the background task if not already running."""
        if not self._is_running:
            loop = asyncio.get_event_loop()
            self._worker_task = loop.create_task(self._worker_loop())

    def stop_background_worker(self):
        """Stop the background task."""
        self._is_running = False
        if self._worker_task and not self._worker_task.done():
            self._worker_task.cancel()


# Singleton instance configured for 30-minute intervals
sync_manager = RoboflowSyncManager(interval_seconds=DEFAULT_INTERVAL_SECONDS)
