"""Routers package initialization."""

from . import (
    auth,
    datasets,
    health,
    inference,
    label_studio_router,
    line_bot_router,
    minio_router,
    modal_trainer_router,
    models,
    parking_router,
    roboflow_router,
    train,
)

__all__ = [
    "auth",
    "datasets",
    "health",
    "inference",
    "label_studio_router",
    "line_bot_router",
    "minio_router",
    "modal_trainer_router",
    "models",
    "parking_router",
    "roboflow_router",
    "train",
]
