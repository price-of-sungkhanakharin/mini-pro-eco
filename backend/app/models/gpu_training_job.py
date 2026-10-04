"""GPUTrainingJobModel definition for Private GPU Compute Node tracking."""

from datetime import datetime, timezone
from sqlalchemy import JSON, Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text

from backend.db.database import Base


class GPUTrainingJobModel(Base):
    """ORM model representing a training job dispatched to Private GPU Compute Node."""

    __tablename__ = "gpu_training_jobs"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(String(64), unique=True, nullable=False, index=True)
    dataset_id = Column(String(64), nullable=False, default="ds_cctv_parking_v1")
    base_model = Column(String(64), nullable=False, default="yolo11n.pt")
    epochs = Column(Integer, nullable=False, default=50)
    batch_size = Column(Integer, nullable=False, default=16)
    imgsz = Column(Integer, nullable=False, default=640)
    device_target = Column(String(64), default="NVIDIA GeForce GTX 1660 SUPER (6GB)")

    # Status: PREFLIGHT, PREFLIGHT_FAILED, QUEUED, INITIALIZING, TRAINING, COMPLETED, FAILED, CANCELLED
    status = Column(String(32), nullable=False, default="PREFLIGHT", index=True)
    preflight_passed = Column(Boolean, default=False, nullable=False)
    preflight_detail = Column(JSON, nullable=True)

    progress_pct = Column(Float, default=0.0)
    current_epoch = Column(Integer, default=0)
    best_map50 = Column(Float, nullable=True)
    best_precision = Column(Float, nullable=True)
    best_recall = Column(Float, nullable=True)
    metrics = Column(JSON, nullable=True)

    minio_code_path = Column(String(512), nullable=True)
    minio_output_path = Column(String(512), nullable=True)
    gpu_node_job_id = Column(String(64), nullable=True)
    error_message = Column(Text, nullable=True)

    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "job_id": self.job_id,
            "dataset_id": self.dataset_id,
            "base_model": self.base_model,
            "epochs": self.epochs,
            "batch_size": self.batch_size,
            "imgsz": self.imgsz,
            "device_target": self.device_target,
            "status": self.status,
            "preflight_passed": self.preflight_passed,
            "preflight_detail": self.preflight_detail,
            "progress_pct": self.progress_pct,
            "current_epoch": self.current_epoch,
            "best_map50": self.best_map50,
            "best_precision": self.best_precision,
            "best_recall": self.best_recall,
            "metrics": self.metrics,
            "minio_code_path": self.minio_code_path,
            "minio_output_path": self.minio_output_path,
            "error_message": self.error_message,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
