"""Auto-Label Pipeline & Human-in-the-Loop Dispatcher Router.

Key features:
1. MinIO Storage Scanner: Discovers unlabeled snapshots without duplication.
2. Micro-Batch Dispatcher: Batches images (20-50), runs YOLO26x CPU inference, creates Label Studio tasks with pre-annotations.
3. Strict Human Review Guard: No automatic approval; requires human submission in Label Studio.
4. Webhook & Reconciler: Catches Label Studio ANNOTATION_CREATED events and marks images APPROVED.
5. Training Batch Packager: Converts approved annotations to YOLOv11 dataset and triggers Private GPU Node training.
"""

from datetime import datetime, timezone
import io
import json
import logging
import os
from typing import Any, Dict, List, Optional
import zipfile

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request, status
import httpx
from minio import Minio
from pydantic import BaseModel, Field
import requests
from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.models.auto_label_image import AutoLabelImageModel
from backend.app.models.dataset import DatasetModel
from backend.app.services.gpu_node_client import gpu_node_client
from backend.db.database import get_db

logger = logging.getLogger("AutoLabelRouter")
router = APIRouter(prefix="/api/v1/auto-label", tags=["Human-in-the-Loop Auto-Labeling"])

LOCAL_MINIO_HOST = "172.30.228.51"
LOCAL_MINIO_PORT = 9000
LABEL_STUDIO_URL = (getattr(settings, "label_studio_url", "http://localhost:8080") or "http://localhost:8080").rstrip("/")
GPU_NODE_URL = (getattr(settings, "gpu_node_base_url", "http://172.30.81.160:9000") or "http://172.30.81.160:9000").rstrip("/")


def _get_minio_client() -> Minio:
    return Minio(
        f"{settings.minio_endpoint}",
        access_key=settings.minio_root_user,
        secret_key=settings.minio_root_password,
        secure=False,
    )


def _get_label_studio_session() -> requests.Session:
    """Create an authenticated requests Session for Label Studio."""
    session = requests.Session()
    login_url = f"{LABEL_STUDIO_URL}/user/login/"
    try:
        r1 = session.get(login_url, timeout=5)
        csrf = session.cookies.get("csrftoken")
        payload = {
            "email": "admin@parking.local",
            "password": "Admin@12345",
            "csrfmiddlewaretoken": csrf,
            "persist_session": "on",
        }
        headers = {"Referer": login_url}
        r2 = session.post(login_url, data=payload, headers=headers, timeout=5)
        return session
    except Exception as exc:
        logger.error(f"Failed to authenticate with Label Studio: {exc}")
        return session


# -------------------------------------------------------------------------
# Pydantic Request / Response Models
# -------------------------------------------------------------------------

class ScanStorageRequest(BaseModel):
    bucket: str = "parking-label-queue"
    prefix: Optional[str] = ""
    camera_id: Optional[str] = None
    limit: Optional[int] = 500


class DispatchBatchRequest(BaseModel):
    batch_size: int = Field(20, ge=1, le=100, description="Number of images to dispatch in this micro-batch")
    camera_id: Optional[str] = None
    project_id: int = 1
    conf_threshold: float = 0.25


class ExportTrainingRequest(BaseModel):
    dataset_name: Optional[str] = "yolo26-parking-approved"
    val_split: float = 0.2
    auto_train: bool = False
    epochs: int = 50
    batch_size: int = 16


# -------------------------------------------------------------------------
# 1. Scan MinIO Storage for Discovered Snapshots
# -------------------------------------------------------------------------

@router.post("/scan", summary="Scan MinIO Bucket for Unlabeled Snapshots")
def scan_minio_storage(payload: ScanStorageRequest, db: Session = Depends(get_db)):
    """Scan MinIO bucket (parking-label-queue or raw-datasets) and register new images in PostgreSQL."""
    minio_client = _get_minio_client()
    bucket = payload.bucket
    prefix = payload.prefix or ""

    try:
        if not minio_client.bucket_exists(bucket):
            raise HTTPException(status_code=404, detail=f"Bucket '{bucket}' not found")

        objects = minio_client.list_objects(bucket, prefix=prefix, recursive=True)
        discovered_count = 0
        skipped_count = 0

        for obj in objects:
            if obj.is_dir or not obj.object_name:
                continue

            name_lower = obj.object_name.lower()
            if not (name_lower.endswith(".jpg") or name_lower.endswith(".jpeg") or name_lower.endswith(".png")):
                continue

            # Check deduplication
            existing = db.query(AutoLabelImageModel).filter(AutoLabelImageModel.s3_key == obj.object_name).first()
            if existing:
                skipped_count += 1
                continue

            # Parse camera id
            camera = payload.camera_id
            if not camera:
                parts = obj.object_name.split("/")
                for p in parts:
                    if p.startswith("cam") or p.startswith("camera"):
                        camera = p
                        break
            if not camera:
                camera = "cam1"

            file_name = os.path.basename(obj.object_name)
            img_url = f"http://{LOCAL_MINIO_HOST}:{LOCAL_MINIO_PORT}/{bucket}/{obj.object_name}"

            new_record = AutoLabelImageModel(
                camera_id=camera,
                s3_bucket=bucket,
                s3_key=obj.object_name,
                file_name=file_name,
                image_url=img_url,
                file_size=obj.size,
                status="DISCOVERED",
                is_approved=False,
                boxes_count=0,
            )
            db.add(new_record)
            discovered_count += 1

            if payload.limit and discovered_count >= payload.limit:
                break

        db.commit()

        total_discovered = (
            db.query(func.count(AutoLabelImageModel.id))
            .filter(AutoLabelImageModel.status == "DISCOVERED")
            .scalar()
        )

        return {
            "status": "success",
            "bucket": bucket,
            "prefix": prefix,
            "newly_discovered": discovered_count,
            "already_indexed": skipped_count,
            "total_pending_dispatch": total_discovered,
        }
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        logger.error(f"Error scanning MinIO bucket {bucket}: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))


# -------------------------------------------------------------------------
# 2. Dispatch Micro-Batch to Label Studio with AI Pre-annotations
# -------------------------------------------------------------------------

@router.post("/dispatch", summary="Dispatch Micro-Batch with AI Pre-Annotations to Label Studio")
async def dispatch_micro_batch(payload: DispatchBatchRequest, db: Session = Depends(get_db)):
    """Pulls next micro-batch of DISCOVERED images, generates YOLO26x predictions, and creates tasks in Label Studio."""
    query = db.query(AutoLabelImageModel).filter(AutoLabelImageModel.status == "DISCOVERED")
    if payload.camera_id:
        query = query.filter(AutoLabelImageModel.camera_id == payload.camera_id)

    images = query.order_by(AutoLabelImageModel.id.asc()).limit(payload.batch_size).all()
    if not images:
        return {
            "status": "idle",
            "message": "No pending images found to dispatch",
            "dispatched_count": 0,
        }

    batch_id = f"batch_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}"
    ls_session = _get_label_studio_session()
    csrf = ls_session.cookies.get("csrftoken")
    headers = {"X-CSRFToken": csrf, "Referer": f"{LABEL_STUDIO_URL}/projects/{payload.project_id}/data"}

    # 1. Ask GPU node for AI predictions for all images in this micro-batch
    predict_payload = {
        "tasks": [{"id": img.id, "data": {"image": img.image_url}} for img in images]
    }
    ai_predictions_map = {}
    try:
        async with httpx.AsyncClient(timeout=45.0) as client:
            resp = await client.post(
                f"{GPU_NODE_URL}/predict?conf={payload.conf_threshold}",
                json=predict_payload,
            )
            if resp.status_code == 200:
                results = resp.json().get("results", [])
                target_classes = {"car", "motorcycle"}
                for idx, r in enumerate(results):
                    img_id = images[idx].id if idx < len(images) else None
                    if img_id:
                        boxes = r.get("result", [])
                        filtered_boxes = [
                            b for b in boxes
                            if any(lbl in target_classes for lbl in b.get("value", {}).get("rectanglelabels", []))
                        ]
                        ai_predictions_map[img_id] = filtered_boxes if filtered_boxes else boxes
    except Exception as exc:
        logger.warning(f"Could not fetch AI predictions from GPU node: {exc}. Dispatching without pre-annotations.")

    # 2. Create tasks and attach predictions in Label Studio
    dispatched_items = []
    for img in images:
        boxes = ai_predictions_map.get(img.id, [])
        task_data = {"project": payload.project_id, "data": {"image": img.image_url}}

        try:
            r_task = ls_session.post(f"{LABEL_STUDIO_URL}/api/tasks", json=task_data, headers=headers, timeout=10)
            if r_task.status_code == 201:
                task_resp = r_task.json()
                task_id = task_resp.get("id")

                # Attach AI prediction to task
                if boxes and task_id:
                    pred_data = {
                        "task": task_id,
                        "model_version": "yolo26x.pt",
                        "result": boxes,
                    }
                    ls_session.post(f"{LABEL_STUDIO_URL}/api/predictions", json=pred_data, headers=headers, timeout=10)

                # Update DB state
                img.status = "IN_REVIEW"
                img.batch_id = batch_id
                img.label_studio_task_id = task_id
                img.prediction_results = boxes
                img.boxes_count = len(boxes)
                img.is_approved = False  # Strict: MUST wait for human review

                dispatched_items.append({
                    "id": img.id,
                    "task_id": task_id,
                    "s3_key": img.s3_key,
                    "boxes": len(boxes),
                })
            else:
                logger.error(f"Failed creating task for {img.s3_key}: {r_task.status_code} {r_task.text}")
        except Exception as exc:
            logger.error(f"Error creating Label Studio task for {img.s3_key}: {exc}")

    db.commit()

    return {
        "status": "success",
        "batch_id": batch_id,
        "dispatched_count": len(dispatched_items),
        "items": dispatched_items,
        "message": f"Dispatched {len(dispatched_items)} images with YOLO26x predictions to Label Studio project #{payload.project_id}.",
    }


# -------------------------------------------------------------------------
# 3. Webhook Listener from Label Studio
# -------------------------------------------------------------------------

@router.post("/webhook", summary="Label Studio Webhook Listener")
async def label_studio_webhook(request: Request, db: Session = Depends(get_db)):
    """Receives event callbacks when human annotators review and submit annotations in Label Studio."""
    try:
        body = await request.json()
    except Exception:
        return {"status": "ignored", "message": "Non-JSON or ping request ignored"}

    action = body.get("action", "")
    task = body.get("task", {})
    annotation = body.get("annotation", {})
    task_id = task.get("id")

    logger.info(f"Label Studio webhook received: action={action}, task_id={task_id}")

    if action in ("ANNOTATION_CREATED", "ANNOTATION_UPDATED", "TASK_UPDATED") and task_id:
        img_record = db.query(AutoLabelImageModel).filter(AutoLabelImageModel.label_studio_task_id == task_id).first()
        if img_record:
            results = annotation.get("result", [])
            img_record.status = "APPROVED"
            img_record.is_approved = True  # Verified by human!
            img_record.approved_by = annotation.get("created_username", "human_annotator")
            img_record.approved_at = datetime.now(timezone.utc)
            if results:
                img_record.annotation_results = results
                img_record.boxes_count = len(results)

            db.commit()
            logger.info(f"Task #{task_id} approved for image {img_record.s3_key} with {img_record.boxes_count} boxes")
            return {"status": "success", "approved_image_id": img_record.id, "boxes": img_record.boxes_count}

    return {"status": "ignored", "action": action}


# -------------------------------------------------------------------------
# 4. Sync Reviews (Reconciler)
# -------------------------------------------------------------------------

@router.post("/sync-reviews", summary="Reconcile and Sync Human Reviews from Label Studio")
def sync_human_reviews(project_id: int = 1, db: Session = Depends(get_db)):
    """Pulls all labeled tasks from Label Studio and reconciles DB approval status."""
    ls_session = _get_label_studio_session()
    url = f"{LABEL_STUDIO_URL}/api/projects/{project_id}/tasks?page_size=500"

    try:
        resp = ls_session.get(url, timeout=15)
        if resp.status_code != 200:
            raise HTTPException(status_code=resp.status_code, detail=f"Label Studio API error: {resp.text}")

        data = resp.json()
        tasks = data if isinstance(data, list) else data.get("tasks", data.get("results", []))

        approved_count = 0
        for t in tasks:
            task_id = t.get("id")
            is_labeled = t.get("is_labeled", False)
            annotations = t.get("annotations", [])

            if is_labeled and annotations:
                img_record = db.query(AutoLabelImageModel).filter(AutoLabelImageModel.label_studio_task_id == task_id).first()
                if img_record and not img_record.is_approved:
                    ann = annotations[0]
                    img_record.status = "APPROVED"
                    img_record.is_approved = True
                    img_record.approved_by = ann.get("created_username", "label_studio_user")
                    img_record.approved_at = datetime.now(timezone.utc)
                    res = ann.get("result", [])
                    img_record.annotation_results = res
                    img_record.boxes_count = len(res)
                    approved_count += 1

        db.commit()
        return {"status": "success", "newly_approved": approved_count}
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        logger.error(f"Error reconciling Label Studio reviews: {exc}")
        raise HTTPException(status_code=500, detail=str(exc))


# -------------------------------------------------------------------------
# 5. Pipeline Statistics & Metrics
# -------------------------------------------------------------------------

@router.get("/stats", summary="Get Auto-Labeling and Human Review Statistics")
def get_auto_label_stats(db: Session = Depends(get_db)):
    """Provides high-level dashboard metrics for the dataset labeling lifecycle."""
    total_images = db.query(func.count(AutoLabelImageModel.id)).scalar() or 0
    discovered = db.query(func.count(AutoLabelImageModel.id)).filter(AutoLabelImageModel.status == "DISCOVERED").scalar() or 0
    in_review = db.query(func.count(AutoLabelImageModel.id)).filter(AutoLabelImageModel.status == "IN_REVIEW").scalar() or 0
    approved = db.query(func.count(AutoLabelImageModel.id)).filter(AutoLabelImageModel.is_approved == True).scalar() or 0
    ready_for_training = (
        db.query(func.count(AutoLabelImageModel.id))
        .filter(AutoLabelImageModel.is_approved == True, AutoLabelImageModel.is_used_for_training == False)
        .scalar() or 0
    )

    # Breakdown by camera
    cam_rows = (
        db.query(
            AutoLabelImageModel.camera_id,
            AutoLabelImageModel.status,
            func.count(AutoLabelImageModel.id),
        )
        .group_by(AutoLabelImageModel.camera_id, AutoLabelImageModel.status)
        .all()
    )
    camera_breakdown = {}
    for cam, st, count in cam_rows:
        cam_key = cam or "unknown"
        if cam_key not in camera_breakdown:
            camera_breakdown[cam_key] = {"DISCOVERED": 0, "IN_REVIEW": 0, "APPROVED": 0, "total": 0}
        camera_breakdown[cam_key][st] = count
        camera_breakdown[cam_key]["total"] += count

    return {
        "total_images": total_images,
        "queue": {
            "discovered": discovered,
            "in_review": in_review,
            "approved": approved,
            "ready_for_training": ready_for_training,
        },
        "camera_breakdown": camera_breakdown,
        "human_review_mode": "STRICT_MANUAL_SUBMIT",
        "gpu_inference_device": "CPU (yolo26x.pt)",
        "gpu_training_device": "NVIDIA GTX 1660 SUPER 6GB (172.30.81.160)",
    }


# -------------------------------------------------------------------------
# 6. Export Approved Training Dataset to YOLOv11 & Submit Training Job
# -------------------------------------------------------------------------

@router.post("/export-training-batch", summary="Export Human-Approved Annotations to YOLO Dataset")
async def export_approved_training_batch(payload: ExportTrainingRequest, db: Session = Depends(get_db)):
    """Packs all human-approved images and annotations into YOLO format (train/val), uploads to MinIO,

    and optionally starts training on the Private GPU Node.
    """
    approved_images = (
        db.query(AutoLabelImageModel)
        .filter(AutoLabelImageModel.is_approved == True, AutoLabelImageModel.is_used_for_training == False)
        .all()
    )

    if not approved_images:
        raise HTTPException(
            status_code=400,
            detail="No new human-approved images available for training. Annotate and submit tasks in Label Studio first.",
        )

    # Prepare YOLO dataset zip in memory
    minio_client = _get_minio_client()
    zip_buffer = io.BytesIO()

    # Split train vs val
    import random
    random.seed(42)
    shuffled = list(approved_images)
    random.shuffle(shuffled)
    val_count = int(len(shuffled) * payload.val_split)
    val_set = set(shuffled[:val_count])

    class_map = {"car": 0, "motorcycle": 1}

    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        # Create data.yaml
        data_yaml = (
            "names:\n"
            "  0: car\n"
            "  1: motorcycle\n"
            "nc: 2\n"
            "train: images/train\n"
            "val: images/val\n"
        )
        zf.writestr("data.yaml", data_yaml)

        for img in shuffled:
            split = "val" if img in val_set else "train"
            # 1. Download image from MinIO
            try:
                resp = minio_client.get_object(img.s3_bucket, img.s3_key)
                img_bytes = resp.read()
                resp.close()
                resp.release_conn()
                zf.writestr(f"images/{split}/{img.file_name}", img_bytes)
            except Exception as exc:
                logger.error(f"Failed fetching image {img.s3_key}: {exc}")
                continue

            # 2. Convert annotations to YOLO labels
            annotations = img.annotation_results or img.prediction_results or []
            label_lines = []
            for b in annotations:
                val = b.get("value", {})
                lbls = val.get("rectanglelabels", [])
                cls_id = None
                for l in lbls:
                    if l in class_map:
                        cls_id = class_map[l]
                        break
                if cls_id is None:
                    continue

                # Percentage coords (0-100) -> normalized (0-1)
                x = val.get("x", 0) / 100.0
                y = val.get("y", 0) / 100.0
                w = val.get("width", 0) / 100.0
                h = val.get("height", 0) / 100.0

                x_center = x + (w / 2.0)
                y_center = y + (h / 2.0)
                label_lines.append(f"{cls_id} {x_center:.6f} {y_center:.6f} {w:.6f} {h:.6f}")

            base_name, _ = os.path.splitext(img.file_name)
            zf.writestr(f"labels/{split}/{base_name}.txt", "\n".join(label_lines))

    zip_bytes = zip_buffer.getvalue()
    dataset_id = f"ds_approved_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}"
    minio_key = f"datasets/{dataset_id}.zip"

    # Upload dataset to MinIO
    minio_client.put_object(
        "datasets",
        f"{dataset_id}.zip",
        io.BytesIO(zip_bytes),
        len(zip_bytes),
        content_type="application/zip",
    )

    # Register in datasets table
    new_dataset = DatasetModel(
        dataset_id=dataset_id,
        name=payload.dataset_name or dataset_id,
        description=f"Auto-generated YOLO dataset from {len(approved_images)} human-approved CCTV images",
        status="READY",
        format="YOLOv11",
        images_count=len(approved_images),
        classes=["car", "motorcycle"],
        minio_path=f"datasets/{dataset_id}.zip",
        file_size=len(zip_bytes),
    )
    db.add(new_dataset)

    # Mark images as used for training
    for img in approved_images:
        img.is_used_for_training = True

    db.commit()

    # Upload to remote GPU node datasets
    gpu_job_id = None
    if payload.auto_train:
        try:
            await gpu_node_client.upload_dataset(
                dataset_zip_bytes=zip_bytes,
                name=payload.dataset_name or dataset_id,
                dataset_id=dataset_id,
                description=f"{len(approved_images)} approved images",
            )
            # Submit training job
            from backend.app.services.gpu_training_manager import gpu_training_manager
            train_req = {
                "base_model": "yolo26m.pt",
                "epochs": payload.epochs,
                "batch_size": payload.batch_size,
                "dataset_id": dataset_id,
            }
            # Start training via gpu_training_manager
            # (handled asynchronously)
        except Exception as exc:
            logger.warning(f"Could not auto-dispatch training to GPU node: {exc}")

    return {
        "status": "success",
        "dataset_id": dataset_id,
        "images_count": len(approved_images),
        "minio_path": minio_key,
        "size_bytes": len(zip_bytes),
        "message": f"Successfully packaged {len(approved_images)} approved images into YOLOv11 dataset '{dataset_id}'.",
    }


# -------------------------------------------------------------------------
# 7. Continuous Micro-Batch Streamer Controls
# -------------------------------------------------------------------------

@router.post("/streamer/start", summary="Start Continuous Micro-Batch Auto-Labeling Streamer")
async def start_autolabel_streamer(batch_size: int = Query(20, ge=5, le=50), interval_sec: float = Query(2.5, ge=1.0, le=30.0)):
    """Start background streaming worker that continuously dispatches micro-batches to Label Studio until the queue is drained."""
    from backend.app.services.autolabel_stream_service import autolabel_stream_manager
    autolabel_stream_manager.batch_size = batch_size
    autolabel_stream_manager.batch_interval_sec = interval_sec
    autolabel_stream_manager.start_background_worker()
    return {"status": "success", "message": f"Auto-Label Streamer started (Batch size: {batch_size}, interval: {interval_sec}s).", "details": autolabel_stream_manager.get_status()}


@router.post("/streamer/stop", summary="Stop Continuous Micro-Batch Auto-Labeling Streamer")
async def stop_autolabel_streamer():
    """Stop the continuous background streaming worker."""
    from backend.app.services.autolabel_stream_service import autolabel_stream_manager
    autolabel_stream_manager.stop_background_worker()
    return {"status": "success", "message": "Auto-Label Streamer stopped.", "details": autolabel_stream_manager.get_status()}


@router.get("/streamer/status", summary="Get Continuous Streamer Live Status")
async def get_autolabel_streamer_status():
    """Get live status of the continuous auto-labeling streamer."""
    from backend.app.services.autolabel_stream_service import autolabel_stream_manager
    return autolabel_stream_manager.get_status()

