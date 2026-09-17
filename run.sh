#!/usr/bin/env bash
# FastAPI AI Ecosystem Runner Script

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Activate virtual environment if available
if [ -d ".venv" ]; then
    source .venv/bin/activate
fi

# Default configuration
HOST="${HOST:-0.0.0.0}"
PORT="${PORT:-8000}"
RELOAD="${RELOAD:---reload}"

echo "🚀 Starting FastAPI AI Ecosystem Gateway Server on http://$HOST:$PORT..."
exec uvicorn backend.main:app --host "$HOST" --port "$PORT" $RELOAD
