"""AutoLabelImage model definition for automated image queueing, labeling, and review lifecycle."""

from datetime import datetime, timezone
from sqlalchemy import BigInteger, Boolean, Column, DateTime, Integer, JSON, String, Text

from backend.db.database import Base


class AutoLabelImageModel(Base):
    """PostgreSQL ORM model tracking images through the Auto-Labeling and Human Review lifecycle.

    Lifecycle:
    - DISCOVERED: Image scanned from MinIO storage, queued for micro-batch dispatch.
    - IN_REVIEW: Image dispatched to Label Studio with AI pre-annotations, waiting for human approval.
    - APPROVED: Human annotator submitted/confirmed annotation in Label Studio (is_approved=True).
    - REJECTED: Annotator marked image as unviable / blurry.
    """

    __tablename__ = "auto_label_images"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    batch_id = Column(String(64), index=True, nullable=True)  # e.g., batch_20261005_cam1_001
    camera_id = Column(String(32), index=True, nullable=True)  # cam1, cam2, etc.
    s3_bucket = Column(String(64), default="parking-label-queue", nullable=False)
    s3_key = Column(String(512), unique=True, index=True, nullable=False)
    file_name = Column(String(255), nullable=False)
    image_url = Column(String(512), nullable=False)
    file_size = Column(BigInteger, default=0, nullable=False)

    status = Column(String(32), default="DISCOVERED", index=True, nullable=False)
    label_studio_task_id = Column(Integer, unique=True, index=True, nullable=True)

    # Human-in-the-Loop strict flags (No blind auto-approval)
    is_approved = Column(Boolean, default=False, index=True, nullable=False)
    approved_by = Column(String(128), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)

    # Annotation and prediction data
    prediction_results = Column(JSON, nullable=True)  # AI predictions from YOLO26x
    annotation_results = Column(JSON, nullable=True)  # Human confirmed labels
    boxes_count = Column(Integer, default=0, nullable=False)

    # Training lifecycle
    is_used_for_training = Column(Boolean, default=False, index=True, nullable=False)
    training_job_id = Column(String(64), nullable=True)

    captured_at = Column(DateTime(timezone=True), index=True, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def to_dict(self):
        return {
            "id": self.id,
            "batch_id": self.batch_id,
            "camera_id": self.camera_id,
            "s3_bucket": self.s3_bucket,
            "s3_key": self.s3_key,
            "file_name": self.file_name,
            "image_url": self.image_url,
            "file_size": self.file_size,
            "status": self.status,
            "label_studio_task_id": self.label_studio_task_id,
            "is_approved": self.is_approved,
            "approved_by": self.approved_by,
            "approved_at": self.approved_at.isoformat() if self.approved_at else None,
            "boxes_count": self.boxes_count,
            "is_used_for_training": self.is_used_for_training,
            "training_job_id": self.training_job_id,
            "captured_at": self.captured_at.isoformat() if self.captured_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
