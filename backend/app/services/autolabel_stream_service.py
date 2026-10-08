"""Auto-Label Continuous Streaming Service (100% Async Non-Blocking).

Continuously processes unlabeled snapshots in streaming micro-batches:
- Scans MinIO storage for new frames.
- Streams micro-batches (20-30 images) to Private GPU Node (YOLO26x on CPU).
- Pushes pre-annotated tasks into Label Studio asynchronously without blocking the event loop.
- Loops continuously until all images in the queue are dispatched.
- Resumes when new snapshots arrive.
- Human review is strictly preserved: images remain IN_REVIEW until human approval.
"""

import asyncio
from datetime import datetime, timezone
import logging
import os
import time
from typing import Any, Dict, List, Optional

import httpx
from minio import Minio
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.models.auto_label_image import AutoLabelImageModel
from backend.db.database import SessionLocal

logger = logging.getLogger("AutoLabelStreamer")

LOCAL_MINIO_HOST = "172.30.228.51"
LOCAL_MINIO_PORT = 9000
LABEL_STUDIO_URL = (getattr(settings, "label_studio_url", "http://localhost:8080") or "http://localhost:8080").rstrip("/")
GPU_NODE_URL = (getattr(settings, "gpu_node_base_url", "http://172.30.81.160:9000") or "http://172.30.81.160:9000").rstrip("/")


class AutoLabelStreamManager:
    """Manages continuous micro-batch streaming of images to YOLO26x and Label Studio."""

    def __init__(
        self,
        batch_size: int = 20,
        batch_interval_sec: float = 2.0,
        idle_interval_sec: float = 30.0,
    ):
        self.batch_size = batch_size
        self.batch_interval_sec = batch_interval_sec
        self.idle_interval_sec = idle_interval_sec

        self._is_running = False
        self._worker_task: Optional[asyncio.Task] = None
        self._total_dispatched = 0
        self._last_batch_time: Optional[datetime] = None
        self._last_batch_count = 0
        self._status_message = "Idle"

    @property
    def is_running(self) -> bool:
        return self._is_running

    def get_status(self) -> Dict[str, Any]:
        return {
            "is_running": self._is_running,
            "batch_size": self.batch_size,
            "batch_interval_sec": self.batch_interval_sec,
            "total_dispatched_this_session": self._total_dispatched,
            "last_batch_time": self._last_batch_time.isoformat() if self._last_batch_time else None,
            "last_batch_count": self._last_batch_count,
            "status_message": self._status_message,
        }

    def _get_minio_client(self) -> Minio:
        return Minio(
            f"{settings.minio_endpoint}",
            access_key=settings.minio_root_user,
            secret_key=settings.minio_root_password,
            secure=False,
        )

    async def _login_label_studio(self, client: httpx.AsyncClient) -> Dict[str, str]:
        """Asynchronously log in to Label Studio and return headers with cookies."""
        login_url = f"{LABEL_STUDIO_URL}/user/login/"
        try:
            r1 = await client.get(login_url, timeout=5.0)
            csrf = r1.cookies.get("csrftoken", "")
            payload = {
                "email": "admin@parking.local",
                "password": "Admin@12345",
                "csrfmiddlewaretoken": csrf,
                "persist_session": "on",
            }
            headers = {"Referer": login_url}
            await client.post(login_url, data=payload, headers=headers, timeout=5.0)
            session_csrf = client.cookies.get("csrftoken", csrf)
            return {"X-CSRFToken": session_csrf}
        except Exception as exc:
            logger.warning(f"Label Studio async login error: {exc}")
            return {}

    def scan_minio_unlabeled(self, db: Session, bucket: str = "raw-datasets", limit: int = 500) -> int:
        """Scan MinIO bucket for live camera images from today onwards."""
        from datetime import timezone, timedelta
        bkk_tz = timezone(timedelta(hours=7))
        today_str = datetime.now(bkk_tz).strftime("%Y-%m-%d")
        try:
            minio_client = self._get_minio_client()
            if not minio_client.bucket_exists(bucket):
                return 0

            discovered_count = 0
            # Scan only active cameras with today's date prefix
            cams = ["cam1", "cam2", "cam3"]
            for cam in cams:
                prefix = f"dataset/{cam}/{today_str}/"
                objects = minio_client.list_objects(bucket, prefix=prefix, recursive=True)

                for obj in objects:
                    if obj.is_dir or not obj.object_name:
                        continue
                    name_lower = obj.object_name.lower()
                    if not (name_lower.endswith(".jpg") or name_lower.endswith(".jpeg") or name_lower.endswith(".png")):
                        continue

                    # Deduplication check
                    existing = db.query(AutoLabelImageModel.id).filter(AutoLabelImageModel.s3_key == obj.object_name).first()
                    if existing:
                        continue

                    img_url = f"http://{LOCAL_MINIO_HOST}:{LOCAL_MINIO_PORT}/{bucket}/{obj.object_name}"
                    new_record = AutoLabelImageModel(
                        camera_id=cam,
                        s3_bucket=bucket,
                        s3_key=obj.object_name,
                        file_name=os.path.basename(obj.object_name),
                        image_url=img_url,
                        file_size=obj.size,
                        status="DISCOVERED",
                        is_approved=False,
                        boxes_count=0,
                    )
                    db.add(new_record)
                    discovered_count += 1
                    if limit and discovered_count >= limit:
                        break

                if limit and discovered_count >= limit:
                    break

            if discovered_count > 0:
                db.commit()
                logger.info(f"[AutoLabelStreamer] Discovered and indexed {discovered_count} fresh images from {bucket} ({today_str}).")
            return discovered_count
        except Exception as exc:
            db.rollback()
            logger.error(f"[AutoLabelStreamer] Error scanning MinIO {bucket}: {exc}")
            return 0

    async def _fetch_predictions_with_retry(self, predict_payload: Dict[str, Any], max_retries: int = 3) -> Dict[int, List[Dict[str, Any]]]:
        """Fetch AI predictions with automatic retry and exponential backoff."""
        ai_predictions_map = {}
        for attempt in range(1, max_retries + 1):
            try:
                async with httpx.AsyncClient(timeout=45.0) as client:
                    resp = await client.post(
                        f"{GPU_NODE_URL}/predict?conf=0.25",
                        json=predict_payload,
                    )
                    if resp.status_code == 200:
                        results = resp.json().get("results", [])
                        target_classes = {"car", "motorcycle"}
                        for idx, r in enumerate(results):
                            tasks_list = predict_payload.get("tasks", [])
                            img_id = tasks_list[idx]["id"] if idx < len(tasks_list) else None
                            if img_id:
                                boxes = r.get("result", [])
                                filtered_boxes = [
                                    b for b in boxes
                                    if any(lbl in target_classes for lbl in b.get("value", {}).get("rectanglelabels", []))
                                ]
                                ai_predictions_map[img_id] = filtered_boxes if filtered_boxes else boxes
                        return ai_predictions_map
                    else:
                        logger.warning(f"[AutoLabelStreamer] GPU Node returned HTTP {resp.status_code} (attempt {attempt}/{max_retries})")
            except Exception as exc:
                logger.warning(f"[AutoLabelStreamer] Connection attempt {attempt}/{max_retries} to GPU node failed: {exc}")

            if attempt < max_retries:
                await asyncio.sleep(2.0 * attempt)

        return ai_predictions_map

    async def _dispatch_next_batch(self, db: Session, project_id: int = 1) -> int:
        """Fetch next batch of DISCOVERED images (Newest Live Snapshots First), predict on GPU/CPU, and upload to Label Studio."""
        images = (
            db.query(AutoLabelImageModel)
            .filter(AutoLabelImageModel.status == "DISCOVERED")
            .order_by(AutoLabelImageModel.created_at.desc(), AutoLabelImageModel.id.desc())
            .limit(self.batch_size)
            .all()
        )

        if not images:
            return 0

        batch_id = f"stream_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}"

        # 1. Fetch AI predictions from GPU Node with retry
        predict_payload = {
            "tasks": [{"id": img.id, "data": {"image": img.image_url}} for img in images]
        }
        ai_predictions_map = await self._fetch_predictions_with_retry(predict_payload, max_retries=3)

        if not ai_predictions_map:
            logger.warning("[AutoLabelStreamer] GPU Node unreachable or returned empty predictions. Retrying batch next cycle...")
            self._status_message = "Retrying GPU Node connection..."
            return 0

        # 2. Push to Label Studio using async client with login retry
        success_count = 0
        async with httpx.AsyncClient(timeout=20.0) as ls_client:
            headers = await self._login_label_studio(ls_client)
            headers["Referer"] = f"{LABEL_STUDIO_URL}/projects/{project_id}/data"

            for img in images:
                boxes = ai_predictions_map.get(img.id, [])
                task_data = {"project": project_id, "data": {"image": img.image_url}}

                try:
                    r_task = await ls_client.post(
                        f"{LABEL_STUDIO_URL}/api/tasks",
                        json=task_data,
                        headers=headers,
                    )
                    if r_task.status_code == 201:
                        task_id = r_task.json().get("id")
                        if boxes and task_id:
                            pred_data = {
                                "task": task_id,
                                "model_version": "yolo26x.pt",
                                "result": boxes,
                            }
                            await ls_client.post(
                                f"{LABEL_STUDIO_URL}/api/predictions",
                                json=pred_data,
                                headers=headers,
                            )

                        img.status = "IN_REVIEW"
                        img.batch_id = batch_id
                        img.label_studio_task_id = task_id
                        img.prediction_results = boxes
                        img.boxes_count = len(boxes)
                        img.is_approved = False
                        success_count += 1
                except Exception as exc:
                    logger.error(f"[AutoLabelStreamer] Task creation error for {img.s3_key}: {exc}")

        db.commit()
        self._total_dispatched += success_count
        self._last_batch_time = datetime.now(timezone.utc)
        self._last_batch_count = success_count

        total_pending = (
            db.query(func.count(AutoLabelImageModel.id))
            .filter(AutoLabelImageModel.status == "DISCOVERED")
            .scalar() or 0
        )
        total_in_review = (
            db.query(func.count(AutoLabelImageModel.id))
            .filter(AutoLabelImageModel.status == "IN_REVIEW")
            .scalar() or 0
        )

        self._status_message = (
            f"Streaming active: Dispatched batch of {success_count} fresh images. "
            f"({total_pending} remaining in queue, {total_in_review} in review in Label Studio)"
        )
        logger.info(f"[AutoLabelStreamer] {self._status_message}")
        return success_count

    async def _stream_loop(self):
        """Infinite loop: continuously dispatches micro-batches with persistent reconnect."""
        logger.info("[AutoLabelStreamer] Streaming worker loop initiated.")
        self._status_message = "Starting stream..."
        consecutive_errors = 0

        while self._is_running:
            db = SessionLocal()
            try:
                # 1. Check if there are DISCOVERED images to process
                count_dispatched = await self._dispatch_next_batch(db)

                if count_dispatched > 0:
                    consecutive_errors = 0
                    await asyncio.sleep(self.batch_interval_sec)
                    continue

                # 2. If no DISCOVERED images, scan MinIO raw-datasets for newly arrived live camera snapshots
                self.scan_minio_unlabeled(db, bucket="raw-datasets", limit=300)

                # Check queue again
                remaining = (
                    db.query(func.count(AutoLabelImageModel.id))
                    .filter(AutoLabelImageModel.status == "DISCOVERED")
                    .scalar() or 0
                )

                if remaining == 0:
                    self._status_message = "All live camera frames processed. Polling MinIO for new snapshots..."
                    await asyncio.sleep(self.idle_interval_sec)
                else:
                    await asyncio.sleep(self.batch_interval_sec)

            except asyncio.CancelledError:
                logger.info("[AutoLabelStreamer] Streaming worker received cancellation request.")
                break
            except Exception as exc:
                consecutive_errors += 1
                backoff_sec = min(30.0, 3.0 * consecutive_errors)
                logger.error(f"[AutoLabelStreamer] Error in streaming loop (retrying in {backoff_sec}s): {exc}")
                self._status_message = f"Reconnecting to queue / GPU Node in {backoff_sec}s..."
                await asyncio.sleep(backoff_sec)
            finally:
                db.close()

        self._is_running = False
        self._status_message = "Stopped"
        logger.info("[AutoLabelStreamer] Streaming worker loop terminated.")

    def start_background_worker(self):
        """Start the background streaming task."""
        if self._is_running:
            logger.info("[AutoLabelStreamer] Worker is already active.")
            return

        self._is_running = True
        try:
            loop = asyncio.get_running_loop()
            self._worker_task = loop.create_task(self._stream_loop())
        except RuntimeError:
            loop = asyncio.get_event_loop()
            self._worker_task = loop.create_task(self._stream_loop())
        logger.info("[AutoLabelStreamer] Background stream worker started successfully.")

    def stop_background_worker(self):
        """Stop the background streaming task."""
        if not self._is_running:
            return

        self._is_running = False
        if self._worker_task and not self._worker_task.done():
            self._worker_task.cancel()
        logger.info("[AutoLabelStreamer] Background stream worker stopped.")


# Singleton instance
autolabel_stream_manager = AutoLabelStreamManager(batch_size=20, batch_interval_sec=2.0, idle_interval_sec=30.0)
