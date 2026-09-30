from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, Response, UploadFile, status
from sqlalchemy.orm import Session

from backend.app.core.security import get_current_user
from backend.db.database import get_db
from backend.app.models.dataset import DatasetModel
from backend.app.models.user import UserModel
from backend.app.schemas.dataset import DatasetResponse
from backend.app.services.minio_service import MinIOService

router = APIRouter(prefix="/api/v1/datasets", tags=["Datasets"])


@router.post(
    "/upload",
    response_model=DatasetResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload Raw Dataset",
    description="Stream raw dataset file to MinIO bucket ('raw-datasets') and record metadata in PostgreSQL.",
    responses={
        201: {"description": "Dataset uploaded and recorded successfully"},
        401: {"description": "Unauthorized access"},
        500: {"description": "Upload processing error"},
    },
)
async def upload_dataset(
    file: UploadFile = File(...),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Stream raw dataset file to MinIO bucket ('raw-datasets') and record metadata in PostgreSQL."""
    contents = await file.read()
    file_size = len(contents)
    filename = file.filename or "unnamed_dataset"

    bucket_name = "raw-datasets"
    object_path = f"datasets/{current_user.id}/{filename}"

    minio_service = MinIOService()
    minio_service.ensure_bucket(bucket_name)
    minio_service.upload_bytes(
        object_name=object_path,
        data=contents,
        bucket_name=bucket_name,
        content_type=file.content_type or "application/octet-stream",
    )

    dataset_record = DatasetModel(
        filename=filename,
        minio_path=object_path,
        file_size=file_size,
        uploaded_by=current_user.id,
    )
    db.add(dataset_record)
    db.commit()
    db.refresh(dataset_record)

    return dataset_record


@router.get(
    "",
    response_model=List[DatasetResponse],
    summary="List Datasets",
    description="Get list of uploaded datasets with pagination parameters (skip, limit).",
    responses={
        200: {"description": "List of dataset records retrieved successfully"},
        401: {"description": "Unauthorized access"},
    },
)
@router.get("/", response_model=List[DatasetResponse], include_in_schema=False)
def get_datasets(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all datasets with pagination (skip, limit)."""
    datasets = db.query(DatasetModel).offset(skip).limit(limit).all()
    return datasets


@router.get(
    "/{dataset_id}",
    response_model=DatasetResponse,
    summary="Get Dataset by ID",
    description="Retrieve details of a specific dataset record by ID.",
    responses={
        200: {"description": "Dataset details retrieved successfully"},
        404: {"description": "Dataset not found"},
        401: {"description": "Unauthorized access"},
    },
)
def get_dataset_by_id(
    dataset_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get single dataset details by ID."""
    dataset = db.query(DatasetModel).filter(DatasetModel.id == dataset_id).first()
    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset with ID {dataset_id} not found",
        )
    return dataset


@router.post(
    "/camera-upload",
    status_code=status.HTTP_201_CREATED,
    summary="Upload Camera Frame Dataset Directly to MinIO",
    description="Receive raw binary JPEG frame from IoT camera (ESP32-CAM) and store in MinIO bucket 'raw-datasets'.",
)
async def upload_camera_frame(
    request: Request,
    location: str = Query("front_dept", description="Camera location identifier (e.g. front_dept, side_dept)"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Receive raw binary JPEG frame from IoT camera (ESP32-CAM) and store in MinIO bucket 'raw-datasets'."""
    contents = await request.body()
    if not contents:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No image bytes received")

    file_size = len(contents)
    timestamp_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S_%f")
    filename = f"{location}_{timestamp_str}.jpg"
    bucket_name = "raw-datasets"
    object_path = f"camera/{location}/{filename}"

    minio_service = MinIOService()
    minio_service.ensure_bucket(bucket_name)
    minio_service.upload_bytes(
        object_name=object_path,
        data=contents,
        bucket_name=bucket_name,
        content_type="image/jpeg",
    )

    dataset_record = DatasetModel(
        filename=filename,
        minio_path=object_path,
        file_size=file_size,
        uploaded_by=current_user.id,
    )
    db.add(dataset_record)
    db.commit()
    db.refresh(dataset_record)

    return {
        "success": True,
        "location": location,
        "filename": filename,
        "file_size": file_size,
        "minio_path": object_path,
        "uploaded_by": current_user.email,
    }


@router.get(
    "/camera/latest",
    summary="View Latest Camera Frame Directly",
    description="Retrieve the latest JPEG image captured by the camera from MinIO and display it in browser.",
)
def get_latest_camera_frame(
    location: str = Query("front_dept", description="Camera location identifier (e.g. front_dept, side_dept)"),
    db: Session = Depends(get_db),
):
    """Retrieve the latest JPEG image captured by the camera from MinIO and display it in browser."""
    record = (
        db.query(DatasetModel)
        .filter(DatasetModel.filename.like(f"{location}_%.jpg"))
        .order_by(DatasetModel.id.desc())
        .first()
    )
    if not record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"No image available for {location}")

    minio_service = MinIOService()
    try:
        minio_response = minio_service.client.get_object("raw-datasets", record.minio_path)
        image_bytes = minio_response.read()
        minio_response.close()
        minio_response.release_conn()
        return Response(content=image_bytes, media_type="image/jpeg")
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
