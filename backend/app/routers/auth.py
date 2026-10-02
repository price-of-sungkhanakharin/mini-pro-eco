import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.core.security import (
    create_access_token,
    get_current_user,
    get_password_hash,
    verify_password,
)
from backend.db.database import get_db
from backend.app.models.user import UserModel
from backend.app.schemas.auth import Token, UserCreate, UserResponse

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register New User Account",
    description="Register a new user account with email, password, and assigned role.",
    responses={
        201: {"description": "User registered successfully"},
        400: {"description": "Email already registered"},
        422: {"description": "Validation error"},
    },
)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    """Register a new user."""
    existing_user = db.query(UserModel).filter(UserModel.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    hashed_password = get_password_hash(user_in.password)
    new_user = UserModel(
        email=user_in.email,
        hashed_password=hashed_password,
        role=user_in.role or "user",
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post(
    "/login",
    response_model=Token,
    summary="User Login & Token Generation",
    description="Authenticate user credentials and issue a JWT access token.",
    responses={
        200: {"description": "Successfully authenticated and issued JWT access token"},
        400: {"description": "Incorrect email or password"},
        422: {"description": "Validation error"},
    },
)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """Authenticate user and return access token."""
    user = db.query(UserModel).filter(UserModel.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect email or password",
        )

    access_token = create_access_token(data={"sub": user.email})
    return Token(access_token=access_token, token_type="bearer")


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get Current Authenticated User",
    description="Retrieve details of currently authenticated user.",
    responses={
        200: {"description": "Current user profile retrieved successfully"},
        401: {"description": "Unauthorized - missing or invalid token"},
    },
)
def get_me(current_user: UserModel = Depends(get_current_user)):
    """Get current authenticated user details."""
    return current_user


@router.get(
    "/sso/minio",
    summary="MinIO Console Single Sign-On Auto Login",
    description="Logs in automatically to MinIO Object Storage Console and redirects browser seamlessly.",
)
async def minio_sso(request: Request):
    """Log in to MinIO Console and redirect user seamlessly without prompt."""
    minio_host = "127.0.0.1"
    minio_port = settings.minio_console_port
    target_host = request.url.hostname or "localhost"

    token = None
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(
                f"http://{minio_host}:{minio_port}/api/v1/login",
                json={
                    "accessKey": settings.minio_root_user,
                    "secretKey": settings.minio_root_password,
                },
            )
            if resp.status_code in (200, 204):
                token = resp.cookies.get("token")
    except Exception:
        pass

    target_url = f"http://{target_host}:{minio_port}/"
    response = RedirectResponse(url=target_url, status_code=status.HTTP_302_FOUND)
    if token:
        response.set_cookie(
            key="token",
            value=token,
            path="/",
            httponly=True,
            samesite="lax",
            max_age=43200,
        )
    return response


@router.get(
    "/sso/postgres",
    summary="Postgres UI (Adminer) Single Sign-On Auto Login",
    description="Redirects user directly to Adminer auto-login interface.",
)
def postgres_sso(request: Request):
    """Redirect to Adminer Postgres UI with auto-login."""
    target_host = request.url.hostname or "localhost"
    adminer_port = 8088
    target_url = f"http://{target_host}:{adminer_port}/"
    return RedirectResponse(url=target_url, status_code=status.HTTP_302_FOUND)

