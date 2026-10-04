"""DatasetModel definition for unified Raw Data & Labeled Datasets."""

from datetime import datetime, timezone
from sqlalchemy import JSON, BigInteger, Boolean, Column, DateTime, ForeignKey, Integer, String, Text

from backend.db.database import Base


class DatasetModel(Base):
    """Dataset ORM model managing both raw ingestion datasets and labeled YOLO datasets."""

    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(String(64), unique=True, index=True, nullable=True)
    name = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    
    # Status: RAW (unlabeled frames), LABELING, LABELED, READY (YOLO format with data.yaml ready for training)
    status = Column(String(32), default="RAW", index=True, nullable=False)
    
    filename = Column(String, nullable=True, default="")
    minio_path = Column(String(512), nullable=False)
    raw_source_path = Column(String(512), nullable=True)
    
    format = Column(String(32), default="YOLOv11", nullable=True)
    images_count = Column(Integer, default=0, nullable=True)
    classes = Column(JSON, nullable=True)
    file_size = Column(BigInteger, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    
    uploaded_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    def to_dict(self):
        return {
            "id": self.id,
            "dataset_id": self.dataset_id or f"ds_{self.id}",
            "name": self.name or self.filename,
            "description": self.description,
            "status": self.status,
            "filename": self.filename,
            "minio_path": self.minio_path,
            "raw_source_path": self.raw_source_path,
            "format": self.format,
            "images_count": self.images_count,
            "classes": self.classes,
            "file_size": self.file_size,
            "is_active": self.is_active,
            "uploaded_by": self.uploaded_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

