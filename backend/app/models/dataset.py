"""DatasetModel definition."""

from datetime import datetime

from sqlalchemy import BigInteger, Column, DateTime, ForeignKey, Integer, String

from backend.db.database import Base


class DatasetModel(Base):
    """Dataset ORM model."""

    __tablename__ = "datasets"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    minio_path = Column(String, nullable=False)
    file_size = Column(BigInteger, nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
