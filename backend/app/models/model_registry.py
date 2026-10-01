"""ModelRegistryModel definition."""

from datetime import datetime

from sqlalchemy import JSON, Boolean, Column, DateTime, Float, ForeignKey, Integer, String

from backend.db.database import Base


class ModelRegistryModel(Base):
    """Model registry ORM model representing registered machine learning models."""

    __tablename__ = "model_registry"

    id = Column(Integer, primary_key=True, index=True)
    model_name = Column(String, nullable=False)
    version = Column(String, nullable=False)
    minio_weight_path = Column(String, nullable=False)
    metrics = Column(JSON, nullable=True)
    is_active = Column(Boolean, default=False, nullable=False)
    map50 = Column(Float, nullable=True)
    epochs = Column(Integer, nullable=True)
    base_model = Column(String, nullable=True)
    roboflow_version = Column(Integer, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
