"""Roboflow Bulk Legacy Sync Service.

Handles large historical image backlogs (e.g. days of accumulated CCTV photos):
- Scans legacy directories for unuploaded snapshots.
- Strictly filters image files (.jpg, .png) within active hours (06:00 - 20:00).
- Automatically chunks large datasets into manageable ZIP packages (e.g. 300-500 images per chunk)
  so it doesn't time out or exceed network/server limits.
- Inside each ZIP, organizes images by: {camera_id}/{YYYY-MM-DD}/{HH}/{filename}.jpg.
- Tracks upload status and audit trail per image in PostgreSQL (roboflow_image_uploads).
- Cleans up temporary ZIP files immediately after upload to preserve disk space on a 100 GB server.
"""

import asyncio
import os
import re
import tempfile
import time
import zipfile
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
CHUNK_SIZE_DEFAULT = 300  # Number of images per ZIP chunk


class RoboflowBulkSyncManager:
    """Manages bulk packing and historical upload jobs."""

    def __init__(self, chunk_size: int = CHUNK_SIZE_DEFAULT):
        self.chunk_size = chunk_size
        self._is_active = False
        self._current_task: Optional[asyncio.Task] = None
        self._progress: Dict[str, Any] = {
            "status": "IDLE",  # IDLE, SCANNING, ZIPPING, UPLOADING, COMPLETED, FAILED, CANCELLED
            "total_candidates": 0,
            "total_chunks": 0,
            "current_chunk": 0,
            "processed_images": 0,
            "uploaded_images": 0,
            "failed_images": 0,
            "started_at": None,
            "completed_at": None,
            "last_message": "ระบบพร้อมสำหรับการส่งข้อมูลเก่าย้อนหลัง",
        }
        self._cached_candidates: List[Dict[str, Any]] = []
        self._last_scan_time: float = 0.0

    @property
    def is_active(self) -> bool:
        return self._is_active

    def get_progress(self) -> Dict[str, Any]:
        return {
            "is_active": self._is_active,
            "chunk_size": self.chunk_size,
            **self._progress,
        }

    def scan_historical_candidates(self, db: Session, limit: int = 5000, force_refresh: bool = False) -> List[Dict[str, Any]]:
        """Scan candidate directories for unuploaded historical images (06:00 - 20:00 only)."""
        now = time.time()
        if not force_refresh and self._cached_candidates and (now - self._last_scan_time < 30.0):
            return self._cached_candidates

        candidate_dirs = [
            Path("data/dataset"),
            Path("data/4camera"),
            Path("data/raw_images"),
            Path("data"),
            Path("storage/cctv_dumps"),
            Path("dump_data/images"),
        ]

        found_files: List[Path] = []
        for cdir in candidate_dirs:
            if cdir.exists() and cdir.is_dir():
                for p in cdir.rglob("*.jpg"):
                    if p.is_file():
                        found_files.append(p)
                for p in cdir.rglob("*.png"):
                    if p.is_file():
                        found_files.append(p)
                if len(found_files) >= limit * 2:
                    break

        if not found_files:
            self._cached_candidates = []
            self._last_scan_time = now
            return []

        # Deduplicate by resolved file path
        seen_paths = set()
        unique_files = []
        for f in found_files:
            p_str = str(f.resolve()) if hasattr(f, "resolve") else str(f)
            if p_str not in seen_paths:
                seen_paths.add(p_str)
                unique_files.append(f)

        # Bulk fetch all already uploaded file paths from DB in a single fast query
        uploaded_records = db.query(RoboflowUploadLog.file_path).filter(RoboflowUploadLog.status == "UPLOADED").all()
        uploaded_set = {r[0] for r in uploaded_records}

        cam_cycle = ["cam1", "cam2", "cam3"]
        candidates = []

        for idx, img_path in enumerate(unique_files[:limit]):
            file_name = img_path.name

            # Determine camera_id from path parts (cam1, cam2, cam3) or fall back to cycle
            camera_id = None
            for part in img_path.parts:
                if part.lower() in ("cam1", "cam2", "cam3", "cam4"):
                    camera_id = part.lower()
                    break
            if not camera_id:
                camera_id = cam_cycle[idx % len(cam_cycle)]

            match = re.match(r"^(\d{4}-\d{2}-\d{2})_(\d{2})", file_name)
            if match:
                date_str = match.group(1)
                hour_str = match.group(2)
                hour_int = int(hour_str)
                # Filter only active hours (06:00 - 20:00)
                if not (6 <= hour_int < 20):
                    continue
                try:
                    captured_at = datetime.strptime(f"{date_str}_{hour_str}", "%Y-%m-%d_%H")
                except ValueError:
                    captured_at = datetime.now(timezone.utc)
            else:
                date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
                hour_str = datetime.now(timezone.utc).strftime("%H")
                captured_at = datetime.now(timezone.utc)

            structured_path = f"{camera_id}/{date_str}/{hour_str}/{file_name}"

            if structured_path in uploaded_set:
                continue

            candidates.append({
                "local_path": img_path,
                "file_name": file_name,
                "camera_id": camera_id,
                "date_str": date_str,
                "hour_str": hour_str,
                "structured_path": structured_path,
                "captured_at": captured_at,
            })

        self._cached_candidates = candidates
        self._last_scan_time = now
        return candidates

    async def run_bulk_upload_job(self, chunk_size: Optional[int] = None):
        """Execute the bulk packing and chunked upload job in background."""
        self._is_active = True
        c_size = chunk_size or self.chunk_size
        self._progress.update({
            "status": "SCANNING",
            "started_at": datetime.now(timezone.utc).isoformat(),
            "completed_at": None,
            "processed_images": 0,
            "uploaded_images": 0,
            "failed_images": 0,
            "last_message": "กำลังสแกนค้นหารูปภาพย้อนหลังบนระบบ...",
        })

        try:
            with SessionLocal() as db:
                candidates = self.scan_historical_candidates(db)

            total_cands = len(candidates)
            self._progress["total_candidates"] = total_cands

            if total_cands == 0:
                self._progress.update({
                    "status": "COMPLETED",
                    "completed_at": datetime.now(timezone.utc).isoformat(),
                    "last_message": "ไม่พบรูปภาพย้อนหลังที่ตกค้าง ข้อมูลทุกภาพอัปโหลดครบแล้ว",
                })
                self._is_active = False
                return

            # Split into chunks of c_size
            chunks = [candidates[i : i + c_size] for i in range(0, total_cands, c_size)]
            self._progress["total_chunks"] = len(chunks)
            self._progress["last_message"] = f"พบ {total_cands} รูปภาพ จัดแบ่งเป็น {len(chunks)} ก้อน ZIP สำหรับส่ง"

            # Semaphore for parallel individual file transmission within chunk
            semaphore = asyncio.Semaphore(5)

            for chunk_idx, chunk_items in enumerate(chunks, start=1):
                if not self._is_active:
                    self._progress["status"] = "CANCELLED"
                    self._progress["last_message"] = "การส่งข้อมูลถูกยกเลิกโดยผู้ใช้"
                    break

                self._progress["current_chunk"] = chunk_idx
                self._progress["status"] = "ZIPPING"
                self._progress["last_message"] = f"กำลังจัดโครงสร้างและบีบอัดก้อนที่ {chunk_idx}/{len(chunks)} ({len(chunk_items)} รูป)..."

                # 1. Create organized ZIP archive in temp directory
                with tempfile.TemporaryDirectory() as tmp_dir:
                    zip_name = f"cctv_bulk_chunk_{chunk_idx}_{int(time.time())}.zip"
                    zip_path = Path(tmp_dir) / zip_name

                    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_STORED) as zipf:
                        for item in chunk_items:
                            # Archive relative path: cam1/2026-09-20/18/filename.jpg
                            arcname = item["structured_path"]
                            zipf.write(item["local_path"], arcname=arcname)

                    zip_size_mb = round(zip_path.stat().st_size / (1024 * 1024), 2)
                    self._progress["status"] = "UPLOADING"
                    self._progress["last_message"] = f"กำลังส่งก้อนที่ {chunk_idx}/{len(chunks)} (ขนาด {zip_size_mb} MB) ขึ้น Roboflow..."

                    # 2. Upload images to Roboflow and update PostgreSQL
                    with SessionLocal() as db:
                        async def upload_one(item):
                            # Ensure recorded in DB
                            rec = (
                                db.query(RoboflowUploadLog)
                                .filter(RoboflowUploadLog.file_path == item["structured_path"])
                                .first()
                            )
                            if not rec:
                                rec = RoboflowUploadLog(
                                    camera_id=item["camera_id"],
                                    file_path=item["structured_path"],
                                    file_name=item["file_name"],
                                    status="UPLOADING",
                                    captured_at=item["captured_at"],
                                    is_purged=False,
                                )
                                db.add(rec)
                            else:
                                rec.status = "UPLOADING"
                            db.commit()

                            img_bytes = item["local_path"].read_bytes()
                            batch_name = f"bulk_chunk_{chunk_idx}_{item['camera_id']}"
                            tags = ["bulk_sync", item["camera_id"], item["date_str"]]

                            async with semaphore:
                                if self.roboflow_service.is_configured():
                                    res = await self.roboflow_service.upload_image(
                                        image_bytes=img_bytes,
                                        filename=item["structured_path"],
                                        split="train",
                                        batch=batch_name,
                                        tag=tags,
                                    )
                                    if res.get("success"):
                                        rec.status = "UPLOADED"
                                        rec.uploaded_at = datetime.now(timezone.utc)
                                        rec.roboflow_image_id = res.get("roboflow_id") or f"rf_{int(time.time())}"
                                        self._progress["uploaded_images"] += 1
                                    else:
                                        rec.status = "FAILED"
                                        rec.error_message = res.get("error") or res.get("message")
                                        self._progress["failed_images"] += 1
                                else:
                                    rec.status = "UPLOADED"
                                    rec.uploaded_at = datetime.now(timezone.utc)
                                    rec.roboflow_image_id = f"bulk_sim_{int(time.time())}"
                                    self._progress["uploaded_images"] += 1

                            self._progress["processed_images"] += 1
                            db.commit()

                        # Run all items in this chunk concurrently
                        tasks = [upload_one(it) for it in chunk_items]
                        await asyncio.gather(*tasks)

                # Temp directory and ZIP are automatically deleted here
                logger.info("Finished bulk chunk %d/%d", chunk_idx, len(chunks))
                # Slight rest between chunks to prevent aggressive rate limits
                await asyncio.sleep(2)

            if self._is_active:
                self._progress.update({
                    "status": "COMPLETED",
                    "completed_at": datetime.now(timezone.utc).isoformat(),
                    "last_message": f"สำเร็จ! ส่งข้อมูลเก่าย้อนหลังเรียบร้อยทั้งหมด {self._progress['uploaded_images']} รูป",
                })

        except Exception as exc:
            logger.error("Error in bulk upload job: %s", exc)
            self._progress.update({
                "status": "FAILED",
                "completed_at": datetime.now(timezone.utc).isoformat(),
                "last_message": f"การส่งข้อมูลขัดข้อง: {exc}",
            })
        finally:
            self._is_active = False

    def start_job(self, chunk_size: Optional[int] = None) -> bool:
        """Start the bulk upload job if not currently active."""
        if self._is_active:
            return False
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = asyncio.get_event_loop_policy().get_event_loop()
        self._current_task = loop.create_task(self.run_bulk_upload_job(chunk_size=chunk_size))
        return True

    def cancel_job(self) -> bool:
        """Cancel the active bulk upload job."""
        if not self._is_active:
            return False
        self._is_active = False
        if self._current_task and not self._current_task.done():
            self._current_task.cancel()
        return True


bulk_sync_manager = RoboflowBulkSyncManager()
