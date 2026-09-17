"""UserModel definition."""

from datetime import datetime

from sqlalchemy import Column, DateTime, Integer, String

from backend.db.database import Base


class UserModel(Base):
    """User ORM model."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="user")
    created_at = Column(DateTime, default=datetime.utcnow)
