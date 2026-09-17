"""Model Registry API router."""

import json
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from backend.app.core.security import get_current_user
from backend.db.database import get_db
from backend.app.models.model_registry import ModelRegistryModel
from backend.app.models.user import UserModel
from backend.app.schemas.model import ModelRegisterRequest, ModelRegistryResponse
from backend.app.services.minio_service import MinIOService

router = APIRouter(prefix="/api/v1/models", tags=["Model Registry"])


@router.post(
    "/register",
    response_model=ModelRegistryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register or Upload Model",
    description="Upload model weights file or register new model version metadata into append-only registry log.",
    responses={
        201: {"description": "Model version registered successfully"},
        401: {"description": "Unauthorized access"},
        500: {"description": "Model registration failure"},
    },
)
@router.post("/upload", response_model=ModelRegistryResponse, status_code=status.HTTP_201_CREATED, include_in_schema=False)
async def register_or_upload_model(
    request: Request,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload & register new model version as append-only log."""
    content_type = request.headers.get("content-type", "")

    model_name = "default_model"
    version = "v1.0.0"
    minio_weight_path = ""
    metrics = None

    if "multipart/form-data" in content_type:
        form = await request.form()
        file = form.get("file")
        model_name = str(form.get("model_name", "default_model"))
        version = str(form.get("version", "v1.0.0"))
        minio_weight_path = str(form.get("minio_weight_path", ""))
        metrics_raw = form.get("metrics")
        if metrics_raw:
            try:
                metrics = json.loads(metrics_raw) if isinstance(metrics_raw, str) else dict(metrics_raw)
            except Exception:
                metrics = {"raw": str(metrics_raw)}

        if file and hasattr(file, "read"):
            contents = await file.read()
            filename = getattr(file, "filename", "model.pt") or "model.pt"
            bucket_name = "model-weights"
            object_path = f"models/{current_user.id}/{filename}"
            minio_service = MinIOService()
            minio_service.ensure_bucket(bucket_name)
            minio_service.upload_bytes(
                object_name=object_path,
                data=contents,
                bucket_name=bucket_name,
                content_type=getattr(file, "content_type", None) or "application/octet-stream",
            )
            minio_weight_path = object_path
    else:
        try:
            body = await request.json()
        except Exception:
            body = {}
        model_name = body.get("model_name", "default_model")
        version = body.get("version", "v1.0.0")
        minio_weight_path = body.get("minio_weight_path", "")
        metrics = body.get("metrics")

    if not minio_weight_path:
        minio_weight_path = f"models/{current_user.id}/{model_name}_{version}.pt"

    model_record = ModelRegistryModel(
        model_name=model_name,
        version=version,
        minio_weight_path=minio_weight_path,
        metrics=metrics,
        created_by=current_user.id,
    )
    db.add(model_record)
    db.commit()
    db.refresh(model_record)
    return model_record


@router.get(
    "",
    response_model=List[ModelRegistryResponse],
    summary="List Registered Models",
    description="Retrieve model version history audit trail with pagination.",
    responses={
        200: {"description": "List of registered model versions retrieved successfully"},
        401: {"description": "Unauthorized access"},
    },
)
@router.get("/", response_model=List[ModelRegistryResponse], include_in_schema=False)
def get_models(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get model version history audit trail."""
    models = (
        db.query(ModelRegistryModel)
        .order_by(ModelRegistryModel.id.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    return models


@router.get(
    "/latest",
    response_model=ModelRegistryResponse,
    summary="Get Latest Model Version",
    description="Retrieve the latest stable model version registered for inference.",
    responses={
        200: {"description": "Latest model record retrieved successfully"},
        404: {"description": "No registered model version found"},
        401: {"description": "Unauthorized access"},
    },
)
def get_latest_model(
    model_name: Optional[str] = Query(None, description="Optional model name filter"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get latest stable model version for inference."""
    query = db.query(ModelRegistryModel)
    if model_name:
        query = query.filter(ModelRegistryModel.model_name == model_name)
    latest_model = query.order_by(ModelRegistryModel.id.desc()).first()

    if not latest_model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No registered model version found",
        )
    return latest_model


@router.get(
    "/{model_id}",
    response_model=ModelRegistryResponse,
    summary="Get Model Details by ID",
    description="Retrieve single model registry record by ID.",
    responses={
        200: {"description": "Model record details retrieved successfully"},
        404: {"description": "Model ID not found"},
        401: {"description": "Unauthorized access"},
    },
)
def get_model_by_id(
    model_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get single model details by ID."""
    model_record = (
        db.query(ModelRegistryModel).filter(ModelRegistryModel.id == model_id).first()
    )
    if not model_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Model with ID {model_id} not found",
        )
    return model_record
