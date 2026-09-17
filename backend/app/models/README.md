# Database ORM Models (`backend/app/models/`)

The `models` directory contains SQLAlchemy object-relational mapping (ORM) entities mapped to PostgreSQL 17 database tables.

---

## 🗄️ Model Schema & Tables

### 1. User Model (`user.py`)
- **Table Name:** `users`
- **Fields:** `id` (Primary Key), `email` (Unique, Indexed), `hashed_password`, `full_name`, `is_active`, `is_superuser`, `created_at`.
- **Purpose:** Stores user authentication credentials and account profiles.

### 2. Dataset Model (`dataset.py`)
- **Table Name:** `datasets`
- **Fields:** `id` (Primary Key), `name`, `description`, `s3_path`, `file_size_bytes`, `mime_type`, `owner_id` (FK -> `users.id`), `created_at`.
- **Purpose:** Stores metadata for raw dataset assets uploaded to MinIO storage.

### 3. Model Registry Model (`model_registry.py`)
- **Table Name:** `model_registry`
- **Fields:** `id` (Primary Key), `name`, `version` (e.g. `v1.0.0`), `framework`, `metrics_json`, `s3_weights_path`, `is_latest`, `created_at`.
- **Design Pattern:** Append-only versioning pattern to preserve reproducible machine learning lineage and deployment history.
