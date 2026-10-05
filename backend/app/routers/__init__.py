"""Routers package initialization."""

from . import (
    analytics_router,
    auth,
    datasets,
    gpu_trainer_router,
    health,
    inference,
    label_studio_router,
    line_bot_router,
    minio_router,
    modal_trainer_router,
    models,
    parking_router,
    roboflow_router,
    settings_router,
    train,
)

__all__ = [
    "analytics_router",
    "auth",
    "datasets",
    "gpu_trainer_router",
    "health",
    "inference",
    "label_studio_router",
    "line_bot_router",
    "minio_router",
    "modal_trainer_router",
    "models",
    "parking_router",
    "roboflow_router",
    "settings_router",
    "train",
]

