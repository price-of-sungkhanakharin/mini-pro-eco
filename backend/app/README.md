# Backend Application Package (`backend/app/`)

The `app` directory contains the application domain modules for the FastAPI AI Ecosystem microservice.

---

## 📂 Submodule Architecture

```text
backend/app/
├── core/         # Environment Settings (BaseSettings) & Security (Bcrypt/JWT)
├── models/       # SQLAlchemy Database ORM Entities
├── routers/      # FastAPI API Controllers & Route Handlers
├── schemas/      # Pydantic Schemas & DTO Validation
├── services/     # S3 MinIO Storage & ARQ Redis Async Worker Services
├── utils/        # Structured JSON Logger & Helper Functions
└── __init__.py
```

---

## 🏛️ Architectural Principles

1. **Clean Separation of Concerns:** Routers delegate domain logic to services and database operations to models.
2. **Strict Request/Response Validation:** Pydantic models in `schemas/` ensure type safety and standard API contracts.
3. **Dependency Injection:** Database sessions (`get_db`) and authentication state (`get_current_user`) are passed through FastAPI's `Depends()`.
