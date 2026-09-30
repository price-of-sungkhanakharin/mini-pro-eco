-- Migration: Create roboflow_image_uploads table for periodic image ingestion & audit
-- Run with: docker compose exec db psql -U postgres -d ai_ecosystem -f create_roboflow_image_uploads.sql

CREATE TABLE IF NOT EXISTS roboflow_image_uploads (
    id SERIAL PRIMARY KEY,
    camera_id VARCHAR(32) NOT NULL,
    file_path VARCHAR(512) NOT NULL UNIQUE,
    file_name VARCHAR(255) NOT NULL,
    status VARCHAR(32) DEFAULT 'PENDING' NOT NULL,
    roboflow_image_id VARCHAR(128),
    captured_at TIMESTAMP WITH TIME ZONE NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE,
    is_purged BOOLEAN DEFAULT FALSE NOT NULL,
    purged_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rf_uploads_status ON roboflow_image_uploads(status);
CREATE INDEX IF NOT EXISTS idx_rf_uploads_camera ON roboflow_image_uploads(camera_id, captured_at);
CREATE INDEX IF NOT EXISTS idx_rf_uploads_captured_at ON roboflow_image_uploads(captured_at);
