#!/usr/bin/env python3
"""Database migration script for Roboflow image uploads tracking table."""

import sys
from pathlib import Path

# Add project root to sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_DIR))

from backend.db.database import Base, engine
from backend.app.models import RoboflowUploadLog
from backend.app.utils.logger import logger


def run_migration():
    print("▶ Running migration: Creating 'roboflow_image_uploads' table...")
    try:
        Base.metadata.create_all(bind=engine)
        print("✓ Migration complete: 'roboflow_image_uploads' table is ready in PostgreSQL.")
    except Exception as exc:
        print(f"✗ Migration failed: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    run_migration()
