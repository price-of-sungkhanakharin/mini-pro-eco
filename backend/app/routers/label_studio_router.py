"""Label Studio Integration API router."""

import json
from typing import Any, Dict, List, Optional
import requests
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from backend.app.core.config import settings
from backend.app.core.security import get_current_user
from backend.app.models.user import UserModel

router = APIRouter(prefix="/api/v1/label-studio", tags=["Label Studio"])


class LabelStudioHealthResponse(BaseModel):
    status: str = Field(..., description="Label Studio health status (healthy/unhealthy)")
    label_studio_url: str = Field(..., description="Base URL of Label Studio instance")
    message: str = Field(..., description="Health status details")


class LabelStudioProject(BaseModel):
    id: int = Field(..., description="Project unique ID")
    title: str = Field(..., description="Project title")
    description: Optional[str] = Field("", description="Project description")
    created_at: Optional[str] = Field(None, description="Creation timestamp")
    task_number: Optional[int] = Field(0, description="Total number of tasks")
    num_tasks_with_annotations: Optional[int] = Field(0, description="Number of annotated tasks")


class LabelStudioTask(BaseModel):
    id: int = Field(..., description="Task unique ID")
    project: int = Field(..., description="Associated Project ID")
    data: Dict[str, Any] = Field(default_factory=dict, description="Task data payload")
    is_labeled: Optional[bool] = Field(False, description="Task labeling status")
    created_at: Optional[str] = Field(None, description="Creation timestamp")


def _get_headers() -> Dict[str, str]:
    headers = {"Content-Type": "application/json"}
    if settings.label_studio_api_key and settings.label_studio_api_key != "default_key":
        headers["Authorization"] = f"Token {settings.label_studio_api_key}"
    return headers


@router.get(
    "/health",
    response_model=LabelStudioHealthResponse,
    summary="Check Label Studio Health Status",
    description="Verify connectivity and health of the Label Studio backend service.",
    responses={
        200: {"description": "Label Studio server is healthy and reachable"},
        503: {"description": "Label Studio server is unreachable or degraded"},
    },
)
def check_label_studio_health():
    """Verify Label Studio integration endpoint health."""
    base_url = settings.label_studio_url.rstrip("/")
    health_url = f"{base_url}/health"
    api_health_url = f"{base_url}/api/health"

    try:
        resp = requests.get(health_url, headers=_get_headers(), timeout=3)
        if resp.status_code == 200:
            return LabelStudioHealthResponse(
                status="healthy",
                label_studio_url=base_url,
                message="Label Studio is healthy and operational",
            )
        
        resp_api = requests.get(api_health_url, headers=_get_headers(), timeout=3)
        if resp_api.status_code == 200:
            return LabelStudioHealthResponse(
                status="healthy",
                label_studio_url=base_url,
                message="Label Studio API is healthy and operational",
            )

        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Label Studio health check returned HTTP status {resp.status_code}",
        )
    except requests.RequestException as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Label Studio connection error: {str(exc)}",
        )


@router.get(
    "/projects",
    response_model=List[LabelStudioProject],
    summary="List Label Studio Projects",
    description="Fetch list of data annotation projects from Label Studio server.",
    responses={
        200: {"description": "List of annotation projects retrieved successfully"},
        502: {"description": "Label Studio upstream API error"},
    },
)
def list_projects(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    current_user: UserModel = Depends(get_current_user),
):
    """Retrieve all annotation projects configured in Label Studio."""
    base_url = settings.label_studio_url.rstrip("/")
    url = f"{base_url}/api/projects"

    try:
        resp = requests.get(
            url,
            headers=_get_headers(),
            params={"page": page, "page_size": page_size},
            timeout=5,
        )
        if resp.status_code == 200:
            data = resp.json()
            results = data.get("results", data) if isinstance(data, dict) else data
            projects = []
            for item in results:
                projects.append(
                    LabelStudioProject(
                        id=item.get("id", 0),
                        title=item.get("title", "Untitled Project"),
                        description=item.get("description", ""),
                        created_at=str(item.get("created_at", "")),
                        task_number=item.get("task_number", 0),
                        num_tasks_with_annotations=item.get("num_tasks_with_annotations", 0),
                    )
                )
            return projects
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Label Studio API error [{resp.status_code}]: {resp.text}",
        )
    except requests.RequestException as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to communicate with Label Studio API: {str(exc)}",
        )


@router.get(
    "/projects/{project_id}",
    response_model=LabelStudioProject,
    summary="Get Label Studio Project Details",
    description="Retrieve details of a specific Label Studio annotation project.",
    responses={
        200: {"description": "Project details retrieved successfully"},
        404: {"description": "Label Studio project not found"},
        502: {"description": "Upstream Label Studio communication failure"},
    },
)
def get_project_detail(
    project_id: int,
    current_user: UserModel = Depends(get_current_user),
):
    """Fetch project details by project_id from Label Studio."""
    base_url = settings.label_studio_url.rstrip("/")
    url = f"{base_url}/api/projects/{project_id}"

    try:
        resp = requests.get(url, headers=_get_headers(), timeout=5)
        if resp.status_code == 200:
            item = resp.json()
            return LabelStudioProject(
                id=item.get("id", project_id),
                title=item.get("title", f"Project #{project_id}"),
                description=item.get("description", ""),
                created_at=str(item.get("created_at", "")),
                task_number=item.get("task_number", 0),
                num_tasks_with_annotations=item.get("num_tasks_with_annotations", 0),
            )
        if resp.status_code == 404:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Label Studio project #{project_id} not found",
            )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Label Studio API returned status {resp.status_code}: {resp.text}",
        )
    except requests.RequestException as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to fetch project #{project_id} from Label Studio: {str(exc)}",
        )


@router.get(
    "/projects/{project_id}/tasks",
    response_model=List[LabelStudioTask],
    summary="List Project Tasks in Label Studio",
    description="Retrieve dataset annotation tasks contained within a specified Label Studio project.",
    responses={
        200: {"description": "Successfully retrieved project task list"},
        404: {"description": "Project not found"},
        502: {"description": "Label Studio upstream communication error"},
    },
)
@router.get(
    "/tasks",
    response_model=List[LabelStudioTask],
    summary="List Label Studio Tasks",
    description="Retrieve tasks for a specific project or list all annotation tasks.",
    responses={
        200: {"description": "Tasks list retrieved successfully"},
        502: {"description": "Upstream error"},
    },
)
def list_tasks(
    project_id: Optional[int] = None,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, description="Items per page"),
    current_user: UserModel = Depends(get_current_user),
):
    """Retrieve annotation tasks for project from Label Studio."""
    base_url = settings.label_studio_url.rstrip("/")
    if project_id:
        url = f"{base_url}/api/projects/{project_id}/tasks"
    else:
        url = f"{base_url}/api/tasks"

    try:
        resp = requests.get(
            url,
            headers=_get_headers(),
            params={"page": page, "page_size": page_size},
            timeout=5,
        )
        if resp.status_code == 200:
            data = resp.json()
            results = data.get("tasks", data.get("results", data)) if isinstance(data, dict) else data
            tasks = []
            for item in results:
                tasks.append(
                    LabelStudioTask(
                        id=item.get("id", 0),
                        project=item.get("project", project_id or 0),
                        data=item.get("data", {}),
                        is_labeled=bool(item.get("is_labeled", False)),
                        created_at=str(item.get("created_at", "")),
                    )
                )
            return tasks
        if resp.status_code == 404:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Label Studio project/tasks resource not found",
            )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Label Studio API returned status {resp.status_code}: {resp.text}",
        )
    except requests.RequestException as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to query tasks from Label Studio: {str(exc)}",
        )
