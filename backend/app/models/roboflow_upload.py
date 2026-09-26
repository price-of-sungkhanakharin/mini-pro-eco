"""RoboflowUploadLog model definition for tracking periodic image uploads to Roboflow."""

from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text

from backend.db.database import Base


class RoboflowUploadLog(Base):
    """PostgreSQL ORM model tracking camera image uploads to Roboflow Cloud.
    
    Serves as an audit trail, deduplication index, and lifecycle manager for auto-purge.
    """

    __tablename__ = "roboflow_image_uploads"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    camera_id = Column(String(32), index=True, nullable=False)  # cam1, cam2, cam3
    file_path = Column(String(512), unique=True, index=True, nullable=False)  # cam1/2026-09-26/17/filename.jpg
    file_name = Column(String(255), nullable=False)
    status = Column(String(32), default="PENDING", index=True, nullable=False)  # PENDING, UPLOADING, UPLOADED, FAILED, PURGED
    roboflow_image_id = Column(String(128), nullable=True)
    captured_at = Column(DateTime, index=True, nullable=False)
    uploaded_at = Column(DateTime, nullable=True)
    is_purged = Column(Boolean, default=False, nullable=False)
    purged_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
