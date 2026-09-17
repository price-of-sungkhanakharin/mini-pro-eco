"""Configuration settings for the Backend service."""

import json
from pathlib import Path
from typing import List, Union

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Locate .env dynamically (check root first, then backend/)
ROOT_DIR: Path = Path(__file__).resolve().parents[3]
ENV_FILE: Path = ROOT_DIR / ".env"
if not ENV_FILE.exists():
    ENV_FILE = Path(__file__).resolve().parents[2] / ".env"
if not ENV_FILE.exists():
    ENV_FILE = Path(__file__).resolve().parents[1] / ".env"


class Settings(BaseSettings):
    """Application Settings loaded from environment variables or .env file."""

    redis_host: str = Field(default="localhost")
    redis_port: int = Field(default=6379)
    postgres_host: str = Field(default="localhost")
    postgres_port: int = Field(default=5432)
    postgres_user: str = Field(default="postgres")
    postgres_password: str = Field(default="postgres")
    postgres_db: str = Field(default="ai_ecosystem")
    label_studio_url: str = Field(default="http://localhost:8080")
    label_studio_api_key: str = Field(default="default_key")
    minio_endpoint: str = Field(default="localhost:9000")
    minio_root_user: str = Field(default="minioadmin")
    minio_root_password: str = Field(default="minioadmin")
    minio_bucket: str = Field(default="user-profiles")
    minio_api_port: int = Field(default=9000)
    minio_console_port: int = Field(default=9001)
    secret_key: str = Field(default="super-secret-ai-ecosystem-jwt-key-2026")
    algorithm: str = Field(default="HS256")
    access_token_expire_minutes: int = Field(default=60)
    cors_origins: List[str] = Field(
        default=[
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://localhost:8000",
        ]
    )
    log_level: str = Field(default="DEBUG")
    log_file: str = Field(default="logs/app.log")

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            v = v.strip()
            if not v:
                return []
            if v.startswith("[") and v.endswith("]"):
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings: Settings = Settings()
