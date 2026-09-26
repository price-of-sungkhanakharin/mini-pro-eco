"""Roboflow service for image uploading, dataset synchronization, and workspace deep linking."""

import base64
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

import httpx

from backend.app.core.config import settings
from backend.app.utils.logger import logger

ROBOFLOW_API_BASE = "https://api.roboflow.com"


class RoboflowService:
    """Service wrapping Roboflow REST APIs and workspace integration."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        workspace: Optional[str] = None,
        project: Optional[str] = None,
    ):
        self.api_key = api_key or settings.roboflow_api_key
        self.workspace = workspace or settings.roboflow_workspace
        self.project = project or settings.roboflow_project

    def is_configured(self) -> bool:
        """Check if Roboflow credentials and project are configured."""
        return bool(
            self.api_key
            and self.api_key != "your_roboflow_api_key_here"
            and self.workspace
            and self.workspace != "your_workspace_name"
            and self.project
        )

    def get_project_url(self) -> str:
        """Return direct deep link to the Roboflow annotation studio."""
        if self.workspace and self.project:
            return f"https://app.roboflow.com/{self.workspace}/{self.project}/annotate"
        return "https://app.roboflow.com"

    def get_status(self) -> Dict[str, Any]:
        """Return setup status and metadata for frontend consumption."""
        configured = self.is_configured()
        return {
            "configured": configured,
            "workspace": self.workspace or "Not configured",
            "project": self.project or "Not configured",
            "project_url": self.get_project_url(),
            "has_api_key": bool(self.api_key and self.api_key != "your_roboflow_api_key_here"),
            "message": (
                "Roboflow integration ready."
                if configured
                else "Roboflow credentials pending. Please set ROBOFLOW_API_KEY, ROBOFLOW_WORKSPACE, and ROBOFLOW_PROJECT in .env."
            ),
        }

    async def upload_image(
        self,
        image_bytes: bytes,
        filename: str,
        split: str = "train",
        batch: Optional[str] = None,
        tag: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """Upload a single image frame to the Roboflow project dataset."""
        if not self.is_configured():
            logger.warning("Roboflow upload requested but service is not configured")
            return {
                "success": False,
                "status": "pending_credentials",
                "filename": filename,
                "message": "Roboflow API key or project not configured. Update .env to enable cloud upload.",
            }

        url = f"{ROBOFLOW_API_BASE}/dataset/{self.project}/upload"
        params: Dict[str, Any] = {
            "api_key": self.api_key,
            "name": filename,
            "split": split,
        }
        if batch:
            params["batch"] = batch
        if tag:
            if isinstance(tag, list):
                params["tag"] = ",".join(tag)
            else:
                params["tag"] = str(tag)

        # Encode image to base64 string for Roboflow API payload
        image_b64 = base64.b64encode(image_bytes).decode("utf-8")

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    url,
                    params=params,
                    content=image_b64,
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                )

                if response.status_code in (200, 201):
                    data = response.json()
                    logger.info("Successfully uploaded image %s to Roboflow", filename)
                    return {
                        "success": True,
                        "filename": filename,
                        "roboflow_id": data.get("id"),
                        "duplicate": data.get("duplicate", False),
                        "message": "Image successfully uploaded to Roboflow dataset.",
                    }
                else:
                    logger.error("Roboflow upload failed: %s %s", response.status_code, response.text)
                    return {
                        "success": False,
                        "status_code": response.status_code,
                        "filename": filename,
                        "error": response.text,
                    }
        except Exception as exc:
            logger.error("Error during Roboflow upload: %s", exc)
            return {"success": False, "filename": filename, "error": str(exc)}

    async def sync_recent_camera_frames(self, sample_limit: int = 5) -> Dict[str, Any]:
        """Scan local camera ingestion directories and upload latest frames."""
        candidate_dirs = [
            Path("/drsum/data/raw_images/front_dept"),
            Path("/drsum/data/raw_images/side_dept"),
            Path("C:/drsum/data/raw_images/front_dept"),
            Path("C:/drsum/data/raw_images/side_dept"),
            Path("data/raw_images/front_dept"),
            Path("data/raw_images/side_dept"),
        ]

        found_files: List[Path] = []
        for cdir in candidate_dirs:
            if cdir.exists() and cdir.is_dir():
                jpgs = sorted(cdir.glob("*.jpg"), key=os.path.getmtime, reverse=True)
                found_files.extend(jpgs[:sample_limit])

        if not found_files:
            return {
                "success": True,
                "synced_count": 0,
                "message": "No local camera images found in raw_images directories yet.",
            }

        upload_results = []
        for fpath in found_files[:sample_limit]:
            with open(fpath, "rb") as f:
                img_data = f.read()
            res = await self.upload_image(img_data, fpath.name)
            upload_results.append(res)

        return {
            "success": True,
            "total_found": len(found_files),
            "synced_count": len(upload_results),
            "results": upload_results,
        }

    async def download_dataset_export(
        self,
        version: int = 1,
        export_format: str = "yolov8",
    ) -> Dict[str, Any]:
        """Request Roboflow to generate and return dataset download link."""
        if not self.is_configured():
            return {
                "success": False,
                "message": "Roboflow credentials not configured. Please specify ROBOFLOW_API_KEY in .env.",
            }

        url = f"{ROBOFLOW_API_BASE}/{self.workspace}/{self.project}/{version}/{export_format}"
        params = {"api_key": self.api_key}

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(url, params=params)
                if response.status_code == 200:
                    data = response.json()
                    export_info = data.get(export_format, {})
                    zip_url = export_info.get("link")
                    return {
                        "success": True,
                        "version": version,
                        "format": export_format,
                        "download_url": zip_url,
                        "message": "Dataset export link generated successfully.",
                    }
                return {
                    "success": False,
                    "status_code": response.status_code,
                    "error": response.text,
                }
        except Exception as exc:
            return {"success": False, "error": str(exc)}


roboflow_service = RoboflowService()
