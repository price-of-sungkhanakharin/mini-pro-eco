# Automated Test Suite (`tests/`)

The `tests` directory contains automated unit, integration, and component tests for verifying core backend functionality, storage layers, custom logging, and component connections.

---

## Directory Structure & Tests

```text
tests/
├── logging/
│   └── test_logger.py          # Verifies Structured JSON Logger output format
├── minio/
│   ├── test_upload_download.py # Tests object storage put/get operations
│   ├── test_upload_photo.py    # Tests image asset upload and preview
│   └── test_versioning.py     # Tests S3 object versioning
├── test_postgres.py            # Verifies PostgreSQL 17 database connectivity & queries
├── test_label_studio.py        # Verifies Label Studio API integration
├── test_settings.py            # Verifies Pydantic settings loading from .env
└── __init__.py
```

---

## Running Tests

Execute all tests using Pytest:
```bash
pytest tests/ -v
```

Execute a specific test file:
```bash
pytest tests/test_postgres.py -v
```
