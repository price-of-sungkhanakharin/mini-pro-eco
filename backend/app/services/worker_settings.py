"""ARQ Worker configuration and background task definitions."""

import sys
from pathlib import Path
from typing import Any, Dict

# Ensure root directory is in sys.path when running worker directly
sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from arq.connections import RedisSettings

from backend.app.core.config import settings
from backend.app.services.trainer_worker import train_model_job


async def simple_work(ctx: Dict[str, Any], data: Dict[str, Any]) -> Dict[str, Any]:
    """Async background task for ARQ worker queue processing."""
    print("[Worker] Processing job...")
    if isinstance(data, dict):
        for key, val in data.items():
            print(f"  - {key}: {val}")
    else:
        print(f"  - Payload: {data}")
    return {"status": "done", "data": data}


class WorkerSettings:
    """ARQ Worker configuration settings."""

    functions = [simple_work, train_model_job]
    redis_settings: RedisSettings = RedisSettings(
        host=settings.redis_host,
        port=settings.redis_port,
    )
