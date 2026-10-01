# Application Services (`backend/app/services/`)

The `services` directory houses business logic integrations for object storage, asynchronous job queues, and background task execution.

---

## Service Modules

### 1. `minio_service.py`
- Implements S3 object storage operations using MinIO SDK (`minio.Minio`).
- Manages bucket initialization (`raw-datasets`, `model-artifacts`, `export-reports`).
- Functions for file upload (`fput_object` / `put_object`), file download, presigned URL generation, and versioning.

### 2. `enqueue_job.py`
- Interface to Redis for pushing model training tasks to the background worker queue.
- Dispatches async jobs using ARQ or Redis connection pool.

### 3. `worker_settings.py`
- ARQ worker configuration and task definitions (`WorkerSettings`).
- Executes heavy AI/ML training steps out-of-process to avoid blocking the main Uvicorn event loop.
