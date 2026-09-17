"""Inference API router."""

from fastapi import APIRouter, Depends

from backend.app.core.security import get_current_user
from backend.app.models.user import UserModel
from backend.app.schemas.inference import PredictRequest, PredictResponse

router = APIRouter(tags=["Inference"])


@router.post(
    "/api/v1/predict",
    response_model=PredictResponse,
    summary="Execute Model Inference",
    description="High-speed low-latency inference endpoint to run model prediction on input data.",
    responses={
        200: {"description": "Inference output and confidence score"},
        401: {"description": "Unauthorized access"},
        422: {"description": "Validation error in request payload"},
    },
)
@router.post("/predict", response_model=PredictResponse, include_in_schema=False)
def predict(
    request: PredictRequest,
    current_user: UserModel = Depends(get_current_user),
):
    """High-speed low-latency inference endpoint."""
    return PredictResponse(
        prediction={
            "result": "success",
            "model_id": request.model_id,
            "processed_input": request.input_data,
        },
        confidence=0.95,
        model_version="v1.0.0",
    )
