# FastAPI Router Controllers (`backend/app/routers/`)

The `routers` directory contains all HTTP API endpoint route handlers for the backend gateway microservice.

---

## 📋 Router Module Catalog

| Module | Prefix | Tags | Description & Key Endpoints |
| :--- | :--- | :--- | :--- |
| [`auth.py`](file:///home/kimbiaw/ai-eco/backend/app/routers/auth.py) | `/api/v1/auth` | Authentication | User registration, login token generation, profile `me` endpoint. |
| [`datasets.py`](file:///home/kimbiaw/ai-eco/backend/app/routers/datasets.py) | `/api/v1/datasets` | Datasets | Dataset binary upload to MinIO, pagination listing, detail fetching. |
| [`models.py`](file:///home/kimbiaw/ai-eco/backend/app/routers/models.py) | `/api/v1/models` | Models | Immutable Model Registry uploads, audit history, latest version retrieval. |
| [`train.py`](file:///home/kimbiaw/ai-eco/backend/app/routers/train.py) | `/api/v1/training` | Training | Async training job enqueue (`202 Accepted`), status polling, job cancellation. |
| [`inference.py`](file:///home/kimbiaw/ai-eco/backend/app/routers/inference.py) | `/api/v1` | Inference | Low-latency model inference prediction endpoint (`/predict`). |
| [`health.py`](file:///home/kimbiaw/ai-eco/backend/app/routers/health.py) | `/api/v1/system` | System | Health check PING for Postgres, MinIO, Redis, Label Studio, and JSON logs. |

---

## 🛠️ Usage Patterns

All routers use FastAPI's `APIRouter()` and are registered centrally in `backend/main.py`. Protected routes declare security dependencies via `Depends(get_current_user)`.
