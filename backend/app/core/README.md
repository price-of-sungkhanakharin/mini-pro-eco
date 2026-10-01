# Core Configuration & Security (`backend/app/core/`)

The `core` directory provides centralized configuration management and application security utilities.

---

## Modules Overview

### 1. `config.py`
- Utilizes `pydantic-settings` (`BaseSettings`) to load and validate environment variables from `.env`.
- Configurations include Database URL, MinIO credentials & host, Redis host, JWT secret key, token expiration algorithm, and CORS allowed origins.

### 2. `security.py`
- **Password Hashing:** Uses `passlib.context.CryptContext` with `bcrypt` for secure user password hashing and verification.
- **JWT Handling:** Functions `create_access_token` and `verify_token` using PyJWT for issuing and verifying stateless bearer tokens.
