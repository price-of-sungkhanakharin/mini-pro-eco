"""Pydantic schemas for authentication and user management."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class UserCreate(BaseModel):
    """Schema for user registration."""

    email: str
    password: str
    role: Optional[str] = "user"


class UserResponse(BaseModel):
    """Schema for user response output."""

    id: int
    email: str
    role: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    """Schema for token response."""

    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """Schema for token payload data."""

    email: Optional[str] = None
