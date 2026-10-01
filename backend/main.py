"""FastAPI AI Ecosystem Gateway API entrypoint."""

import time
import traceback
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.core.config import settings
from backend.db.database import Base, engine
from backend.app.models import DatasetModel, ModelRegistryModel, ParkingOccupancyModel, UserModel  # noqa: F401
from backend.app.routers import (
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
from backend.app.utils.logger import logger

tags_metadata = [
    {
        "name": "System & Health",
        "description": "System diagnostics, health checks, and log operations",
    },
    {
        "name": "Authentication",
        "description": "User authentication, JWT token generation, and user registration",
    },
    {
        "name": "Datasets",
        "description": "Raw dataset storage and MinIO path management",
    },
    {
        "name": "Model Registry",
        "description": "Machine learning model versioning, weights upload, and audit trail",
    },
    {
        "name": "Async Training",
        "description": "Asynchronous training job dispatch and status polling via Redis",
    },
    {
        "name": "Inference",
        "description": "High-performance low-latency AI model inference service",
    },
    {
        "name": "MinIO Storage",
        "description": "MinIO Object Storage management, file uploads, download URLs, and versioning",
    },
    {
        "name": "Label Studio",
        "description": "Label Studio data annotation workspace and task management integration",
    },
    {
        "name": "LINE Chatbot",
        "description": "LINE Messaging API integration with dotBlue AI for smart parking advisory",
    },
    {
        "name": "Roboflow Annotation Platform",
        "description": "Roboflow cloud dataset annotation, auto-upload, and deep linking",
    },
    {
        "name": "Parking Analytics & Time-Series",
        "description": "Time-series occupancy logging and aggregation for parking cameras",
    },
]

app = FastAPI(
    title="FastAPI AI Ecosystem Gateway API",
    version="1.0.0",
    description="Central API Gateway for AI Inference & System Management in Project aieco",
    terms_of_service="http://example.com/terms/",
    contact={"name": "AIECO Dev Team", "email": "dev@aieco.com"},
    license_info={"name": "MIT License", "url": "https://opensource.org/licenses/MIT"},
    openapi_tags=tags_metadata,
)

# CORS Configuration
origins = settings.cors_origins if isinstance(settings.cors_origins, list) else [settings.cors_origins]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|172\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Request/Response & Error Logging Middleware."""
    start_time = time.time()
    client_host = request.client.host if request.client else "unknown"
    response = await call_next(request)
    process_time = time.time() - start_time
    duration_ms = int(process_time * 1000)

    log_extra = {
        "path": request.url.path,
        "method": request.method,
        "status_code": response.status_code,
        "client_ip": client_host,
        "duration_ms": duration_ms,
        "operation": f"{request.method} {request.url.path}",
        "status": "SUCCESS" if response.status_code < 400 else "FAIL",
    }

    log_msg = f"{request.method} {request.url.path} HTTP/{request.scope.get('http_version', '1.1')} {response.status_code} - {duration_ms}ms"

    if response.status_code >= 500:
        logger.error(log_msg, extra=log_extra)
    elif response.status_code >= 400:
        logger.warning(log_msg, extra=log_extra)
    else:
        logger.info(log_msg, extra=log_extra)

    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global Unhandled Exception Handler."""
    logger.error(
        "Unhandled Exception on %s %s: %s",
        request.method,
        request.url.path,
        str(exc),
        exc_info=True,
        extra={
            "path": request.url.path,
            "method": request.method,
            "error_detail": str(exc),
            "traceback": traceback.format_exc(),
        },
    )
    return JSONResponse(status_code=500, content={"detail": "Internal Server Error"})


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """HTTP Exception Handler."""
    logger.warning(
        "HTTPException [%s] on %s %s: %s",
        exc.status_code,
        request.method,
        request.url.path,
        exc.detail,
        extra={
            "status_code": exc.status_code,
            "path": request.url.path,
            "method": request.method,
            "error_detail": exc.detail,
        },
    )
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Request Validation Error Handler."""
    logger.warning(
        "Validation Error [422] on %s %s: %s",
        request.method,
        request.url.path,
        str(exc.errors()),
        extra={
            "status_code": 422,
            "path": request.url.path,
            "method": request.method,
            "error_detail": exc.errors(),
        },
    )
    return JSONResponse(status_code=422, content={"detail": exc.errors()})


@app.on_event("startup")
def startup_event():
    """Execute startup database initialization and start background workers."""
    logger.info("Ensuring database tables exist...", extra={"operation": "startup", "status": "INFO"})
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("FastAPI AI Ecosystem Gateway API successfully started", extra={"operation": "startup", "status": "SUCCESS"})
    except Exception as exc:
        logger.warning(
            "Could not connect to PostgreSQL on startup (running in lightweight/development mode): %s",
            exc,
            extra={"operation": "startup", "status": "WARNING"},
        )
    # Start the automated 2-minute periodic Roboflow synchronization worker
    try:
        from backend.app.services.roboflow_sync_service import sync_manager
        sync_manager.start_background_worker()
        logger.info("Roboflow 2-minute sync worker started", extra={"operation": "startup", "status": "SUCCESS"})
    except Exception as exc:
        logger.warning("Could not start Roboflow sync worker: %s", exc)


@app.on_event("shutdown")
def shutdown_event():
    """Gracefully stop background workers on shutdown."""
    try:
        from backend.app.services.roboflow_sync_service import sync_manager
        sync_manager.stop_background_worker()
    except Exception:
        pass


# Include API Routers
app.include_router(auth.router)
app.include_router(datasets.router)
app.include_router(models.router)
app.include_router(train.router)
app.include_router(inference.router)
app.include_router(health.router)
app.include_router(minio_router.router)
app.include_router(label_studio_router.router)
app.include_router(line_bot_router.router)
app.include_router(parking_router.router)
app.include_router(roboflow_router.router)
app.include_router(modal_trainer_router.router)


@app.get("/")
def root():
    """Gateway Root API endpoint."""
    return {"message": "Welcome to FastAPI AI Ecosystem Gateway API"}

