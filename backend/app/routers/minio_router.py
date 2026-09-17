"""MinIO Object Storage API router."""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from pydantic import BaseModel, Field

from backend.app.core.security import get_current_user
from backend.app.models.user import UserModel
from backend.app.services.minio_service import MinIOService

router = APIRouter(prefix="/api/v1/minio", tags=["MinIO Storage"])


class BucketInfo(BaseModel):
    name: str = Field(..., description="MinIO bucket name")
    creation_date: str = Field(..., description="Creation date timestamp")


class MinIOUploadResponse(BaseModel):
    message: str = Field(..., description="Success message")
    bucket: str = Field(..., description="Target bucket name")
    object_name: str = Field(..., description="Saved object key/path")
    file_size: int = Field(..., description="Uploaded file size in bytes")


class PresignedUrlResponse(BaseModel):
    bucket: str = Field(..., description="Bucket name")
    object_name: str = Field(..., description="Object name")
    download_url: str = Field(..., description="Presigned download URL")
    expires_in_seconds: int = Field(..., description="URL validity duration in seconds")


class VersioningStatusResponse(BaseModel):
    bucket: str = Field(..., description="Bucket name")
    versioning_status: str = Field(..., description="Bucket versioning status")
    message: Optional[str] = Field(None, description="Detailed message")


@router.get(
    "/health",
    summary="Check MinIO Object Storage Health",
    description="Inspect connectivity and responsiveness of the MinIO object storage service.",
    responses={
        200: {
            "description": "MinIO service health status",
            "content": {
                "application/json": {
                    "example": {"status": "healthy", "service": "MinIO Object Storage"}
                }
            },
        },
        503: {"description": "MinIO service unavailable or unreachable"},
    },
)
@router.get("/status", summary="Check MinIO Object Storage Status", include_in_schema=False)
def check_minio_health():
    """Verify MinIO cluster connectivity."""
    try:
        service = MinIOService()
        service.client.list_buckets()
        return {"status": "healthy", "service": "MinIO Object Storage"}
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"MinIO service health check failed: {str(exc)}",
        )


@router.get(
    "/buckets",
    response_model=List[BucketInfo],
    summary="List MinIO Storage Buckets",
    description="Retrieve all existing object storage buckets in the MinIO cluster.",
    responses={
        200: {"description": "Successfully retrieved bucket list"},
        500: {"description": "Failed to list buckets from MinIO server"},
    },
)
def list_buckets(current_user: UserModel = Depends(get_current_user)):
    """List all buckets available in MinIO."""
    try:
        service = MinIOService()
        return service.list_buckets()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list MinIO buckets: {str(exc)}",
        )


@router.post(
    "/upload",
    response_model=MinIOUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload File to MinIO Bucket",
    description="Stream file upload directly to a specified MinIO bucket.",
    responses={
        201: {"description": "File uploaded successfully"},
        400: {"description": "Invalid file upload request"},
        500: {"description": "MinIO upload failure"},
    },
)
async def upload_file(
    file: UploadFile = File(...),
    bucket_name: Optional[str] = Query(None, description="Optional target bucket name"),
    object_prefix: Optional[str] = Query("uploads", description="Directory prefix in bucket"),
    current_user: UserModel = Depends(get_current_user),
):
    """Upload raw file stream into MinIO object storage."""
    try:
        service = MinIOService()
        target_bucket = bucket_name or service.default_bucket
        filename = file.filename or "uploaded_file"
        object_name = f"{object_prefix}/{current_user.id}/{filename}" if object_prefix else f"{current_user.id}/{filename}"

        contents = await file.read()
        service.upload_bytes(
            object_name=object_name,
            data=contents,
            bucket_name=target_bucket,
            content_type=file.content_type or "application/octet-stream",
        )

        return MinIOUploadResponse(
            message="File successfully uploaded to MinIO",
            bucket=target_bucket,
            object_name=object_name,
            file_size=len(contents),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"MinIO file upload failed: {str(exc)}",
        )


@router.get(
    "/download-url",
    response_model=PresignedUrlResponse,
    summary="Generate Presigned Object Download URL",
    description="Generate a secure presigned GET URL for downloading an object from MinIO.",
    responses={
        200: {"description": "Presigned download URL successfully created"},
        404: {"description": "Target object or bucket not found"},
        500: {"description": "Error generating presigned URL"},
    },
)
def get_download_url(
    object_name: str = Query(..., description="Target object path/key in MinIO bucket"),
    bucket_name: Optional[str] = Query(None, description="Target bucket name (defaults to system bucket)"),
    expires_in: int = Query(3600, ge=60, le=86400, description="Expiration time in seconds"),
    current_user: UserModel = Depends(get_current_user),
):
    """Generate temporary presigned HTTP GET download URL."""
    try:
        service = MinIOService()
        target_bucket = bucket_name or service.default_bucket
        download_url = service.get_presigned_url(
            object_name=object_name,
            bucket_name=target_bucket,
            expires_seconds=expires_in,
        )
        return PresignedUrlResponse(
            bucket=target_bucket,
            object_name=object_name,
            download_url=download_url,
            expires_in_seconds=expires_in,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate presigned download URL: {str(exc)}",
        )


@router.get(
    "/versioning",
    response_model=VersioningStatusResponse,
    summary="Get Bucket Versioning Status",
    description="Retrieve object versioning policy status for a MinIO bucket.",
    responses={
        200: {"description": "Versioning status retrieved successfully"},
        500: {"description": "Failed to fetch versioning status"},
    },
)
def get_versioning_status(
    bucket_name: Optional[str] = Query(None, description="Target bucket name"),
    current_user: UserModel = Depends(get_current_user),
):
    """Query object versioning configuration of bucket."""
    try:
        service = MinIOService()
        target_bucket = bucket_name or service.default_bucket
        info = service.get_versioning_status(bucket_name=target_bucket)
        return VersioningStatusResponse(
            bucket=info["bucket"],
            versioning_status=info["versioning_status"],
            message=f"Bucket '{target_bucket}' versioning is {info['versioning_status']}",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to query bucket versioning status: {str(exc)}",
        )


@router.post(
    "/versioning/enable",
    response_model=VersioningStatusResponse,
    summary="Enable Bucket Object Versioning",
    description="Enable multi-version object protection on the designated MinIO bucket.",
    responses={
        200: {"description": "Versioning successfully enabled on bucket"},
        500: {"description": "Failed to enable versioning"},
    },
)
def enable_versioning(
    bucket_name: Optional[str] = Query(None, description="Target bucket name to enable versioning"),
    current_user: UserModel = Depends(get_current_user),
):
    """Enable object versioning for bucket."""
    try:
        service = MinIOService()
        target_bucket = bucket_name or service.default_bucket
        service.enable_versioning(bucket_name=target_bucket)
        return VersioningStatusResponse(
            bucket=target_bucket,
            versioning_status="Enabled",
            message=f"Versioning successfully enabled for bucket '{target_bucket}'",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to enable bucket versioning: {str(exc)}",
        )
