# Backend Microservice Workspace

![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![Python 3.12+](https://img.shields.io/badge/Python_3.12+-3776AB?style=for-the-badge&logo=python&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL_17-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![MinIO](https://img.shields.io/badge/MinIO-C60534?style=for-the-badge&logo=minio&logoColor=white)

The `backend` workspace houses the FastAPI AI Ecosystem Gateway API. It serves as the primary gateway for user authentication, dataset storage management, model registry lineage tracking, asynchronous background training job dispatching, and high-performance machine learning inference.

---

## Directory Overview

```text
backend/
├── app/                      # Main Application Source Code
│   ├── core/                 # Configuration & JWT/Bcrypt Security
│   ├── models/               # SQLAlchemy Database Models
│   ├── routers/              # FastAPI Router Controllers & API Endpoints
│   ├── schemas/              # Pydantic Schemas & DTO Validation
│   ├── services/             # MinIO Storage & ARQ Redis Worker Services
│   └── utils/                # Custom JSON Structured Logger & Directory Helpers
├── db/                       # Database Session Lifecycle & Engine Setup
├── compose.yml               # Backend Services Container Configuration
├── main.py                   # FastAPI Application Entrypoint & Middleware
└── __init__.py
```

---

## Running the Backend Server

### Using Launcher Script (Root)
From the project root directory:
```bash
./run.sh
```

### Direct Uvicorn Execution
From the project root:
```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## Essential Endpoints Overview

- **Swagger UI Interactive Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc Documentation:** [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **OpenAPI Schema (JSON):** [http://localhost:8000/openapi.json](http://localhost:8000/openapi.json)

---

## Security & Middleware

- **JWT Authentication:** OAuth2 Password Bearer flow with stateless JSON Web Tokens.
- **Password Security:** Password hashing via Passlib and Bcrypt algorithm.
- **CORS Middleware:** Configured cross-origin request policies supporting React frontend development.
- **Structured JSON Logging:** Automated request/response timing, status code, and IP audit logging.
