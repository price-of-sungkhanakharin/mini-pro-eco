#!/usr/bin/env bash
# ==============================================================================
# AI Ecosystem Workspace - Unified Management CLI Tool
# Location: ./scripts/manage.sh
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$WORKSPACE_DIR"

# Colors for terminal output
BOLD="\033[1m"
GREEN="\033[0;32m"
BLUE="\033[0;34m"
YELLOW="\033[1;33m"
CYAN="\033[0;36m"
RED="\033[0;31m"
RESET="\033[0m"

# Helper: Check if a TCP port is in use
is_port_in_use() {
    lsof -iTCP:"$1" -sTCP:LISTEN -P -n >/dev/null 2>&1
}

# Print CLI Header
print_header() {
    echo -e "${BOLD}${CYAN}======================================================================${RESET}"
    echo -e "${BOLD}${CYAN}   🚀 AI Ecosystem Unified Management CLI (manage.sh)   ${RESET}"
    echo -e "${BOLD}${CYAN}======================================================================${RESET}"
}

# Show Help
show_help() {
    print_header
    echo -e "${BOLD}Usage:${RESET} ./scripts/manage.sh <command> [options]"
    echo ""
    echo -e "${BOLD}Available Commands:${RESET}"
    echo -e "  ${GREEN}run [PORT]${RESET}            Start FastAPI Backend Server (e.g. ./scripts/manage.sh run 8005)"
    echo -e "  ${GREEN}frontend [PORT]${RESET}       Start React Frontend Web Server (e.g. ./scripts/manage.sh frontend)"
    echo -e "  ${GREEN}status${RESET}                Inspect active services, open ports, and Roboflow status"
    echo -e "  ${GREEN}test [args]${RESET}           Execute automated Pytest suite (e.g. ./scripts/manage.sh test)"
    echo -e "  ${GREEN}export-openapi${RESET}        Export OpenAPI schemas to CSV, Excel, and JSON snapshots"
    echo -e "  ${GREEN}report${RESET}                Generate comprehensive Assignment Report DOCX"
    echo -e "  ${GREEN}docker [up|down|ps]${RESET}   Manage Docker backing services (PostgreSQL, Redis, MinIO)"
    echo -e "  ${GREEN}roboflow [info|sync]${RESET}  Check Roboflow connection or sync camera frames"
    echo -e "  ${GREEN}help${RESET}                  Display this help reference"
    echo ""
    echo -e "${BOLD}Examples:${RESET}"
    echo "  ./scripts/manage.sh run 8005            # Run backend on port 8005 (avoids 8000 conflict)"
    echo "  ./scripts/manage.sh frontend            # Launch frontend at http://localhost:5173"
    echo "  ./scripts/manage.sh status              # Check health & listening ports"
    echo "  ./scripts/manage.sh test                # Run all test suites"
    echo ""
}

# Command: Run Backend
cmd_run() {
    PORT="${1:-8000}"
    HOST="${HOST:-0.0.0.0}"

    print_header
    echo -e "${BLUE}▶ Checking requested backend port: $PORT...${RESET}"

    if is_port_in_use "$PORT"; then
        echo -e "${YELLOW}⚠️  Warning: Port $PORT is currently occupied by another process!${RESET}"
        SUGGESTED_PORT=$((PORT + 1))
        while is_port_in_use "$SUGGESTED_PORT" && [ "$SUGGESTED_PORT" -lt 65535 ]; do
            SUGGESTED_PORT=$((SUGGESTED_PORT + 1))
        done

        if [ -t 0 ]; then
            read -r -p "👉 Enter an alternate port [press Enter for $SUGGESTED_PORT]: " USER_PORT
            PORT="${USER_PORT:-$SUGGESTED_PORT}"
        else
            echo -e "${GREEN}👉 Auto-switching to free port: $SUGGESTED_PORT${RESET}"
            PORT="$SUGGESTED_PORT"
        fi
    fi

    echo -e "${GREEN}✓ Launching FastAPI Gateway on http://$HOST:$PORT${RESET}"
    echo -e "📖 Swagger Docs: ${BOLD}http://localhost:$PORT/docs${RESET}"
    echo -e "📚 ReDoc:        ${BOLD}http://localhost:$PORT/redoc${RESET}"
    echo ""

    if command -v uv >/dev/null 2>&1; then
        exec uv run uvicorn backend.main:app --host "$HOST" --port "$PORT" --reload
    else
        exec uvicorn backend.main:app --host "$HOST" --port "$PORT" --reload
    fi
}

# Command: Run Frontend
cmd_frontend() {
    PORT="${1:-5173}"
    print_header
    echo -e "${BLUE}▶ Starting React Frontend UI...${RESET}"
    cd "$WORKSPACE_DIR/frontend"

    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}node_modules not found. Running npm install first...${RESET}"
        npm install
    fi

    echo -e "${GREEN}✓ Opening Frontend at http://localhost:$PORT${RESET}"
    exec npm run dev -- --port "$PORT"
}

# Command: Check Status
cmd_status() {
    print_header
    echo -e "${BOLD}1. Port Occupancy Inspection:${RESET}"
    for p in 8000 8005 5173 5432 6379 9000 9001 3000; do
        if is_port_in_use "$p"; then
            echo -e "  Port ${BOLD}$p${RESET}: ${RED}● Occupied / Listening${RESET}"
        else
            echo -e "  Port ${BOLD}$p${RESET}: ${GREEN}○ Available (Free)${RESET}"
        fi
    done

    echo ""
    echo -e "${BOLD}2. Roboflow Configuration Status:${RESET}"
    if [ -f "$WORKSPACE_DIR/.env" ]; then
        RF_KEY=$(grep "^ROBOFLOW_API_KEY=" "$WORKSPACE_DIR/.env" | cut -d'=' -f2 || true)
        RF_WS=$(grep "^ROBOFLOW_WORKSPACE=" "$WORKSPACE_DIR/.env" | cut -d'=' -f2 || true)
        RF_PROJ=$(grep "^ROBOFLOW_PROJECT=" "$WORKSPACE_DIR/.env" | cut -d'=' -f2 || true)

        if [ -n "$RF_KEY" ] && [ "$RF_KEY" != "your_roboflow_api_key_here" ]; then
            echo -e "  Roboflow Cloud: ${GREEN}● Configured${RESET}"
            echo -e "  Workspace:      ${BOLD}$RF_WS${RESET}"
            echo -e "  Project:        ${BOLD}$RF_PROJ${RESET}"
            echo -e "  Annotation URL: ${CYAN}https://app.roboflow.com/$RF_WS/$RF_PROJ/annotate${RESET}"
        else
            echo -e "  Roboflow Cloud: ${YELLOW}○ Pending credentials in .env${RESET}"
        fi
    else
        echo -e "  ${YELLOW}.env file not found${RESET}"
    fi

    echo ""
    echo -e "${BOLD}3. Docker Containers Status:${RESET}"
    if command -v docker >/dev/null 2>&1; then
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | head -n 10
    else
        echo "  Docker command not available"
    fi
}

# Command: Run Tests
cmd_test() {
    print_header
    echo -e "${BLUE}▶ Running Automated Test Suite via Pytest...${RESET}"
    shift || true
    if command -v uv >/dev/null 2>&1; then
        uv run --with pytest pytest tests/ "$@"
    else
        pytest tests/ "$@"
    fi
}

# Command: Export OpenAPI Snapshot
cmd_openapi() {
    print_header
    echo -e "${BLUE}▶ Exporting OpenAPI specification snapshots...${RESET}"
    if command -v uv >/dev/null 2>&1; then
        uv run python scripts/export_openapi_snapshot.py
    else
        python scripts/export_openapi_snapshot.py
    fi
    echo -e "${GREEN}✓ Exported snapshots: openapi_snapshot.csv, openapi_snapshot.xlsx, openapi.json${RESET}"
}

# Command: Generate DOCX Report
cmd_report() {
    print_header
    echo -e "${BLUE}▶ Generating Assignment Report DOCX...${RESET}"
    if command -v uv >/dev/null 2>&1; then
        uv run python scripts/generate_assignment_report_docx.py
    else
        python scripts/generate_assignment_report_docx.py
    fi
}

# Command: Docker Operations
cmd_docker() {
    ACTION="${1:-ps}"
    shift || true
    case "$ACTION" in
        up)
            echo -e "${BLUE}Starting Docker backing services...${RESET}"
            docker compose up -d "$@"
            ;;
        down)
            echo -e "${YELLOW}Stopping Docker backing services...${RESET}"
            docker compose down "$@"
            ;;
        ps)
            docker compose ps
            ;;
        *)
            echo "Unknown docker action: $ACTION. Supported: up, down, ps"
            ;;
    esac
}

# Command: Roboflow Actions
cmd_roboflow() {
    ACTION="${1:-info}"
    case "$ACTION" in
        info|status)
            cmd_status
            ;;
        sync)
            echo -e "${BLUE}Syncing camera frames to Roboflow...${RESET}"
            if command -v uv >/dev/null 2>&1; then
                uv run python -c "
import asyncio
from backend.app.services.roboflow_service import roboflow_service
res = asyncio.run(roboflow_service.sync_recent_camera_frames(sample_limit=5))
print('Roboflow Sync Result:', res)
"
            fi
            ;;
        *)
            echo "Unknown roboflow action: $ACTION. Supported: info, sync"
            ;;
    esac
}

# Main CLI Dispatcher
case "$1" in
    run|start|backend)
        shift
        cmd_run "$@"
        ;;
    frontend|ui)
        shift
        cmd_frontend "$@"
        ;;
    status|check)
        cmd_status
        ;;
    test)
        cmd_test "$@"
        ;;
    openapi|export-openapi)
        cmd_openapi
        ;;
    report|docx)
        cmd_report
        ;;
    docker)
        shift
        cmd_docker "$@"
        ;;
    roboflow)
        shift
        cmd_roboflow "$@"
        ;;
    help|--help|-h|"")
        show_help
        ;;
    *)
        echo -e "${RED}Unknown command: $1${RESET}"
        show_help
        exit 1
        ;;
esac
