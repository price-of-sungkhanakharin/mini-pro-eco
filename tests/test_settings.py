"""Test Settings script to inspect loaded configuration parameters."""

import json
import sys
from pathlib import Path

# Ensure root directory is in sys.path when running script directly
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.app.core.config import settings


def test_settings() -> None:
    """Test function for verifying setting parameters load correctly."""
    assert settings.redis_host is not None
    assert settings.postgres_host is not None
    assert settings.label_studio_url is not None


def main() -> None:
    """Main entrypoint for verifying configuration settings."""
    print("--- Loaded Configuration Parameters ---")
    settings_dict = settings.model_dump()
    formatted_json = json.dumps(settings_dict, indent=2, ensure_ascii=False)
    print(formatted_json)


if __name__ == "__main__":
    main()

