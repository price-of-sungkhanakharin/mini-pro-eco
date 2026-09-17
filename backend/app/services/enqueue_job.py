"""Script to enqueue background jobs into the Redis ARQ queue."""

import asyncio
import sys
from pathlib import Path
from typing import Any, Dict

# Ensure root directory is in sys.path when running script directly
sys.path.insert(0, str(Path(__file__).resolve().parents[3]))

from arq import create_pool
from arq.connections import RedisSettings

from backend.app.core.config import settings


async def enqueue_simple_job() -> None:
    """Enqueue a job to the Redis ARQ queue with error handling and status output."""
    redis_settings = RedisSettings(host=settings.redis_host, port=settings.redis_port)

    print(f"[Info] Connecting to Redis at {settings.redis_host}:{settings.redis_port}...")
    try:
        redis_pool = await create_pool(redis_settings)
        payload: Dict[str, Any] = {
            "msg": "Hello from ARQ Queue",
            "task": "Async Job Execution",
        }
        job = await redis_pool.enqueue_job("simple_work", payload)
        print("[Success] Job successfully enqueued to Redis ARQ queue!")
        print(f"  - Job ID: {job.job_id if job else 'Unknown'}")
        print("  - Payload parameters:")
        for key, val in payload.items():
            print(f"      * {key}: {val}")
        try:
            await redis_pool.aclose()
        except AttributeError:
            await redis_pool.close()
    except Exception as exc:
        print(f"[Error] Failed to enqueue job into Redis ARQ queue: {exc}")
        raise


async def enqueue_train_model_job(
    dataset_id: int = 1,
    model_name: str = "token_classification_v1",
    delay_seconds: Optional[int] = None,
    scheduled_time: Optional[str] = None,
    hyperparameters: Optional[Dict[str, Any]] = None,
) -> Optional[str]:
    """Enqueue a Token Classification training job to the Redis ARQ queue."""
    from datetime import datetime, timedelta, timezone

    redis_settings = RedisSettings(host=settings.redis_host, port=settings.redis_port)
    redis_pool = await create_pool(redis_settings)

    payload: Dict[str, Any] = {
        "dataset_id": dataset_id,
        "model_name": model_name,
        "hyperparameters": hyperparameters or {"epochs": 3, "batch_size": 16, "learning_rate": 0.001},
        "delay_seconds": delay_seconds,
        "scheduled_time": scheduled_time,
        "user_id": 1,
    }

    enqueue_kwargs: Dict[str, Any] = {"_queue_name": "arq:queue"}
    if delay_seconds is not None and delay_seconds > 0:
        enqueue_kwargs["_defer_by"] = timedelta(seconds=delay_seconds)
    elif scheduled_time:
        try:
            st = scheduled_time.strip()
            if st.endswith("Z"):
                st = st[:-1] + "+00:00"
            scheduled_dt = datetime.fromisoformat(st)
            if scheduled_dt.tzinfo is None:
                scheduled_dt = scheduled_dt.replace(tzinfo=timezone.utc)
            enqueue_kwargs["_defer_until"] = scheduled_dt
        except Exception:
            pass

    job = await redis_pool.enqueue_job("train_model_job", payload, **enqueue_kwargs)
    job_id = job.job_id if job else None
    print(f"[Success] Training job enqueued! Job ID: {job_id}")
    try:
        await redis_pool.aclose()
    except AttributeError:
        await redis_pool.close()
    return job_id


def main() -> None:
    """Main execution entrypoint."""
    if len(sys.argv) > 1 and sys.argv[1] == "train":
        asyncio.run(enqueue_train_model_job())
    else:
        asyncio.run(enqueue_simple_job())


if __name__ == "__main__":
    main()
