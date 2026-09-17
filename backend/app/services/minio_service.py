from datetime import timedelta
from typing import Any, Dict, List, Optional
from minio import Minio
from minio.versioningconfig import VersioningConfig, ENABLED
from backend.app.core.config import settings
from backend.app.utils.logger import get_custom_logger

logger = get_custom_logger("MinIOService", settings.log_level, "minio")

class MinIOService:
    def __init__(self):
        self.client = Minio(
            settings.minio_endpoint,
            access_key=settings.minio_root_user,
            secret_key=settings.minio_root_password,
            secure=False
        )
        self.default_bucket = settings.minio_bucket

    def ensure_bucket(self, bucket_name: str = None):
        bucket = bucket_name or self.default_bucket
        if not self.client.bucket_exists(bucket):
            self.client.make_bucket(bucket)
            logger.info(
                f"Created bucket '{bucket}'",
                extra={"operation": "ensure_bucket", "status": "SUCCESS"}
            )
        else:
            logger.info(
                f"Bucket '{bucket}' already exists",
                extra={"operation": "ensure_bucket", "status": "INFO"}
            )

    def upload_file(self, object_name: str, file_path: str, bucket_name: str = None):
        bucket = bucket_name or self.default_bucket
        self.ensure_bucket(bucket)
        res = self.client.fput_object(bucket, object_name, file_path)
        logger.info(
            f"Uploaded '{file_path}' to '{bucket}/{object_name}'",
            extra={"operation": "upload_file", "status": "SUCCESS"}
        )
        return res

    def upload_bytes(self, object_name: str, data: bytes, bucket_name: str = None, content_type: str = "application/octet-stream"):
        import io
        bucket = bucket_name or self.default_bucket
        self.ensure_bucket(bucket)
        res = self.client.put_object(
            bucket,
            object_name,
            io.BytesIO(data),
            length=len(data),
            content_type=content_type
        )
        logger.info(
            f"Uploaded bytes to '{bucket}/{object_name}'",
            extra={"operation": "upload_bytes", "status": "SUCCESS"}
        )
        return res

    def download_file(self, object_name: str, file_path: str, bucket_name: str = None, version_id: str = None):
        bucket = bucket_name or self.default_bucket
        self.client.fget_object(bucket, object_name, file_path, version_id=version_id)
        logger.info(
            f"Downloaded '{bucket}/{object_name}' to '{file_path}' (version: {version_id})",
            extra={"operation": "download_file", "status": "SUCCESS"}
        )

    def enable_versioning(self, bucket_name: str = None):
        bucket = bucket_name or self.default_bucket
        self.ensure_bucket(bucket)
        self.client.set_bucket_versioning(bucket, VersioningConfig(ENABLED))
        logger.info(
            f"Enabled versioning for bucket '{bucket}'",
            extra={"operation": "enable_versioning", "status": "SUCCESS"}
        )

    def list_buckets(self) -> List[Dict[str, Any]]:
        buckets = self.client.list_buckets()
        return [
            {
                "name": b.name,
                "creation_date": b.creation_date.isoformat() if hasattr(b.creation_date, "isoformat") else str(b.creation_date),
            }
            for b in buckets
        ]

    def get_presigned_url(self, object_name: str, bucket_name: str = None, expires_seconds: int = 3600) -> str:
        bucket = bucket_name or self.default_bucket
        return self.client.presigned_get_object(bucket, object_name, expires=timedelta(seconds=expires_seconds))

    def get_versioning_status(self, bucket_name: str = None) -> Dict[str, Any]:
        bucket = bucket_name or self.default_bucket
        self.ensure_bucket(bucket)
        config = self.client.get_bucket_versioning(bucket)
        status_val = config.status if hasattr(config, "status") and config.status else "Disabled"
        return {"bucket": bucket, "versioning_status": str(status_val)}

