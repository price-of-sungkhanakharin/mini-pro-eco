#!/usr/bin/env bash
# ==============================================================================
# AI Ecosystem Workspace - Unified Management CLI Tool
# Location: ./scripts/manage.sh
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -f "$SCRIPT_DIR/compose.yml" ]; then
    WORKSPACE_DIR="$SCRIPT_DIR"
else
    WORKSPACE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
fi
cd "$WORKSPACE_DIR"

# Colors & Formatting for terminal output
BOLD="\033[1m"
GREEN="\033[0;32m"
BLUE="\033[0;34m"
YELLOW="\033[1;33m"
CYAN="\033[0;36m"
RED="\033[0;31m"
MAGENTA="\033[0;35m"
RESET="\033[0m"

# Helper: Check if a TCP port is in use
is_port_in_use() {
    (echo > /dev/tcp/127.0.0.1/"$1") >/dev/null 2>&1 || lsof -iTCP:"$1" -sTCP:LISTEN -P -n >/dev/null 2>&1
}

# Print CLI Header
print_header() {
    echo -e "${BOLD}${CYAN}======================================================================${RESET}"
    echo -e "${BOLD}${CYAN}   AI Ecosystem Unified Management CLI (manage.sh)   ${RESET}"
    echo -e "${BOLD}${CYAN}======================================================================${RESET}"
}

# Show Help
show_help() {
    print_header
    echo -e "${BOLD}Usage:${RESET} ./scripts/manage.sh <command> [options]"
    echo ""
    echo -e "${BOLD}Unified Lifecycle Commands:${RESET}"
    echo -e "  ${GREEN}start-all${RESET}             Start entire stack (Docker, Ingestion, Detect Worker, Frontend)"
    echo -e "  ${GREEN}stop-all${RESET}              Stop all stack services gracefully"
    echo -e "  ${GREEN}restart-all${RESET}           Restart all stack services"
    echo -e "  ${GREEN}status${RESET}                Comprehensive diagnostics of services, ports & health"
    echo ""
    echo -e "${BOLD}Component Controls:${RESET}"
    echo -e "  ${GREEN}docker [up|down|ps|logs]${RESET} Manage Docker Compose services (Postgres, Redis, MinIO, etc.)"
    echo -e "  ${GREEN}frontend [PORT]${RESET}       Start React Frontend UI (default port: 5173)"
    echo -e "  ${GREEN}run|backend [PORT]${RESET}    Start FastAPI standalone server (default port: 8000)"
    echo -e "  ${GREEN}ingestion [start|stop]${RESET} Manage ESP32 Camera Ingestion Server (:5005)"
    echo -e "  ${GREEN}detect [start|stop]${RESET}    Manage YOLO Parking Detection Worker"
    echo -e "  ${GREEN}logs [SERVICE]${RESET}        Stream logs (e.g. ./scripts/manage.sh logs fastapi)"
    echo ""
    echo -e "${BOLD}Developer & Platform Tools:${RESET}"
    echo -e "  ${GREEN}test [args]${RESET}           Execute automated Pytest suite"
    echo -e "  ${GREEN}roboflow [info|sync]${RESET}  Check Roboflow connection or sync frames"
    echo -e "  ${GREEN}export-openapi${RESET}        Export OpenAPI schemas to CSV, Excel, and JSON"
    echo -e "  ${GREEN}report${RESET}                Generate comprehensive Assignment Report DOCX"
    echo -e "  ${GREEN}help${RESET}                  Display this help reference"
    echo ""
    echo -e "${BOLD}Quick Examples:${RESET}"
    echo "  ./scripts/manage.sh status             # View full system health & ports"
    echo "  ./scripts/manage.sh start-all          # Start everything in one command"
    echo "  ./scripts/manage.sh docker up          # Start docker backing stack"
    echo "  ./scripts/manage.sh logs fastapi       # Follow FastAPI logs"
    echo ""
}

# Command: Start Entire Stack
cmd_start_all() {
    print_header
    echo -e "${BOLD}${BLUE}▶ Starting Full AI Ecosystem & Smart Parking Stack...${RESET}\n"

    # 1. Docker Compose Services
    echo -e "${CYAN}[1/4] Starting Docker Services (PostgreSQL, Redis, MinIO, Adminer, FastAPI, Label Studio)...${RESET}"
    docker compose up -d
    echo -e "${GREEN}✓ Docker services launched successfully.${RESET}\n"

    # 2. Ingestion Server
    echo -e "${CYAN}[2/4] Checking Ingestion Server (:5005)...${RESET}"
    if is_port_in_use 5005; then
        echo -e "${GREEN}✓ Ingestion Server is already running (:5005).${RESET}\n"
    else
        echo -e "${YELLOW}Starting Ingestion Server in background...${RESET}"
        if [ -f "$WORKSPACE_DIR/.venv/bin/python" ]; then
            nohup "$WORKSPACE_DIR/.venv/bin/python" "$WORKSPACE_DIR/services/ingestion_server.py" > "$WORKSPACE_DIR/logs/ingestion_server.log" 2>&1 &
        else
            nohup python "$WORKSPACE_DIR/services/ingestion_server.py" > "$WORKSPACE_DIR/logs/ingestion_server.log" 2>&1 &
        fi
        sleep 1
        echo -e "${GREEN}✓ Ingestion Server started (PID: $!).${RESET}\n"
    fi

    # 3. Detection Worker
    echo -e "${CYAN}[3/4] Checking CCTV Detection Worker...${RESET}"
    if pgrep -f "detect_worker.py" >/dev/null 2>&1; then
        echo -e "${GREEN}✓ Detection Worker is already active.${RESET}\n"
    else
        echo -e "${YELLOW}Starting Detection Worker in background...${RESET}"
        if [ -f "/home/r211admin/parking-detect/venv/bin/python" ]; then
            nohup /home/r211admin/parking-detect/venv/bin/python /home/r211admin/parking-detect/detect_worker.py > /home/r211admin/parking-detect/detect_worker.log 2>&1 &
            echo -e "${GREEN}✓ Detection Worker started (PID: $!).${RESET}\n"
        elif [ -f "$WORKSPACE_DIR/services/detect_worker.py" ]; then
            nohup python "$WORKSPACE_DIR/services/detect_worker.py" > "$WORKSPACE_DIR/logs/detect_worker.log" 2>&1 &
            echo -e "${GREEN}✓ Detection Worker started (PID: $!).${RESET}\n"
        else
            echo -e "${YELLOW}○ Detection worker script not found in standard path.${RESET}\n"
        fi
    fi

    # 4. Frontend Web UI
    echo -e "${CYAN}[4/4] Checking Frontend UI (:5173)...${RESET}"
    if is_port_in_use 5173; then
        echo -e "${GREEN}✓ Frontend UI is already running on http://localhost:5173${RESET}\n"
    else
        echo -e "${YELLOW}Starting Vite Frontend UI in background...${RESET}"
        cd "$WORKSPACE_DIR/frontend"
        nohup npm run dev -- --host 0.0.0.0 --port 5173 > "$WORKSPACE_DIR/logs/frontend.log" 2>&1 &
        cd "$WORKSPACE_DIR"
        sleep 1
        echo -e "${GREEN}✓ Frontend UI launched on http://localhost:5173 (PID: $!).${RESET}\n"
    fi

    echo -e "${BOLD}${GREEN}======================================================================${RESET}"
    echo -e "${BOLD}${GREEN}   All AI Ecosystem Services are UP & RUNNING! 🎉   ${RESET}"
    echo -e "${BOLD}${GREEN}======================================================================${RESET}"
    echo -e "• Frontend Dashboard:     ${BOLD}http://localhost:5173${RESET}"
    echo -e "• FastAPI Swagger Docs:   ${BOLD}http://localhost:8000/docs${RESET}"
    echo -e "• MinIO Console (SSO):    ${BOLD}http://localhost:9001${RESET}"
    echo -e "• Postgres Adminer UI:    ${BOLD}http://localhost:8088${RESET}"
    echo -e "• Label Studio:           ${BOLD}http://localhost:8080${RESET}"
    echo -e "• Ingestion Server API:   ${BOLD}http://localhost:5005/api/telemetry${RESET}"
    echo ""
}

# Command: Stop Entire Stack
cmd_stop_all() {
    print_header
    echo -e "${BOLD}${YELLOW}▶ Stopping AI Ecosystem Services...${RESET}\n"

    # Stop background workers
    if pgrep -f "detect_worker.py" >/dev/null 2>&1; then
        echo -e "${YELLOW}Stopping Detection Worker...${RESET}"
        pkill -f "detect_worker.py" || true
    fi

    if pgrep -f "ingestion_server.py" >/dev/null 2>&1; then
        echo -e "${YELLOW}Stopping Ingestion Server...${RESET}"
        pkill -f "ingestion_server.py" || true
    fi

    # Stop Docker Compose
    echo -e "${YELLOW}Stopping Docker services...${RESET}"
    docker compose down

    echo -e "${GREEN}✓ All services stopped successfully.${RESET}\n"
}

# Command: Restart All
cmd_restart_all() {
    cmd_stop_all
    sleep 2
    cmd_start_all
}

# Command: Run Backend Standalone
cmd_run() {
    PORT="${1:-8000}"
    HOST="${HOST:-0.0.0.0}"

    print_header
    echo -e "${BLUE}▶ Checking requested backend port: $PORT...${RESET}"

    if is_port_in_use "$PORT"; then
        echo -e "${YELLOW}Warning: Port $PORT is currently occupied!${RESET}"
        SUGGESTED_PORT=$((PORT + 1))
        while is_port_in_use "$SUGGESTED_PORT" && [ "$SUGGESTED_PORT" -lt 65535 ]; do
            SUGGESTED_PORT=$((SUGGESTED_PORT + 1))
        done
        echo -e "${GREEN}Auto-switching to free port: $SUGGESTED_PORT${RESET}"
        PORT="$SUGGESTED_PORT"
    fi

    echo -e "${GREEN}[OK] Launching FastAPI Gateway on http://$HOST:$PORT${RESET}"
    echo -e "Swagger Docs: ${BOLD}http://localhost:$PORT/docs${RESET}"
    echo ""

    if command -v uv >/dev/null 2>&1; then
        exec uv run uvicorn backend.main:app --host "$HOST" --port "$PORT" --reload
    else
        exec uvicorn backend.main:app --host "$HOST" --port "$PORT" --reload
    fi
}

# Command: Run Frontend Standalone
cmd_frontend() {
    PORT="${1:-5173}"
    print_header
    echo -e "${BLUE}▶ Starting React Frontend UI...${RESET}"
    cd "$WORKSPACE_DIR/frontend"

    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}node_modules not found. Running npm install first...${RESET}"
        npm install
    fi

    echo -e "${GREEN}[OK] Opening Frontend at http://localhost:$PORT${RESET}"
    exec npm run dev -- --host 0.0.0.0 --port "$PORT"
}

# Command: Check Status
cmd_status() {
    print_header
    echo -e "${BOLD}${CYAN}1. Active Service Ports & Observability:${RESET}"
    declare -A SERVICES_MAP=(
        [5173]="Frontend Dashboard UI"
        [8000]="FastAPI Gateway API"
        [5005]="ESP32 Camera Ingestion"
        [5432]="PostgreSQL 17 Database"
        [6379]="Redis Task & Cache"
        [8080]="Label Studio Annotation"
        [8088]="PostgreSQL Adminer UI"
        [9000]="MinIO S3 Storage API"
        [9001]="MinIO Console Web UI"
    )

    for p in 5173 8000 5005 5432 6379 8080 8088 9000 9001; do
        srv="${SERVICES_MAP[$p]}"
        if is_port_in_use "$p"; then
            printf "  Port %-5s %-26s : ${GREEN}● ONLINE (Listening)${RESET}\n" "$p" "[$srv]"
        else
            printf "  Port %-5s %-26s : ${RED}○ OFFLINE (Free)${RESET}\n" "$p" "[$srv]"
        fi
    done

    echo ""
    echo -e "${BOLD}${CYAN}2. Background Workers Status:${RESET}"
    if pgrep -f "ingestion_server.py" >/dev/null 2>&1; then
        ING_PID=$(pgrep -f "ingestion_server.py" | head -n 1)
        echo -e "  Ingestion Server:  ${GREEN}● RUNNING (PID: $ING_PID)${RESET}"
    else
        echo -e "  Ingestion Server:  ${RED}○ STOPPED${RESET}"
    fi

    if pgrep -f "detect_worker.py" >/dev/null 2>&1; then
        DET_PID=$(pgrep -f "detect_worker.py" | head -n 1)
        echo -e "  CCTV Detect Worker:${GREEN}● RUNNING (PID: $DET_PID)${RESET}"
    else
        echo -e "  CCTV Detect Worker:${RED}○ STOPPED${RESET}"
    fi

    echo ""
    echo -e "${BOLD}${CYAN}3. Docker Containers Overview:${RESET}"
    if command -v docker >/dev/null 2>&1; then
        docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    else
        echo "  Docker command not available"
    fi

    echo ""
    echo -e "${BOLD}${CYAN}4. FastAPI Gateway Health & Connectivity:${RESET}"
    if is_port_in_use 8000; then
        HEALTH_OUT=$(curl -s -m 2 http://localhost:8000/health 2>/dev/null || true)
        if [ -n "$HEALTH_OUT" ]; then
            echo -e "  Health Check:     ${GREEN}$HEALTH_OUT${RESET}"
        else
            echo -e "  Health Check:     ${YELLOW}Gateway responding on port 8000${RESET}"
        fi
    else
        echo -e "  Health Check:     ${RED}○ Gateway is offline${RESET}"
    fi

    echo ""
    echo -e "${BOLD}${CYAN}5. Roboflow Cloud Annotation Status:${RESET}"
    if [ -f "$WORKSPACE_DIR/.env" ]; then
        RF_KEY=$(grep "^ROBOFLOW_API_KEY=" "$WORKSPACE_DIR/.env" | cut -d'=' -f2 || true)
        RF_WS=$(grep "^ROBOFLOW_WORKSPACE=" "$WORKSPACE_DIR/.env" | cut -d'=' -f2 || true)
        RF_PROJ=$(grep "^ROBOFLOW_PROJECT=" "$WORKSPACE_DIR/.env" | cut -d'=' -f2 || true)

        if [ -n "$RF_KEY" ] && [ "$RF_KEY" != "your_roboflow_api_key_here" ]; then
            echo -e "  Roboflow Cloud:   ${GREEN}● Connected & Configured${RESET}"
            echo -e "  Workspace/Proj:   ${BOLD}$RF_WS / $RF_PROJ${RESET}"
            echo -e "  Annotation Studio:${CYAN}https://app.roboflow.com/$RF_WS/$RF_PROJ/annotate${RESET}"
        else
            echo -e "  Roboflow Cloud:   ${YELLOW}○ Pending credentials in .env${RESET}"
        fi
    fi
    echo ""
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
    echo -e "${GREEN}[OK] Exported snapshots: openapi_snapshot.csv, openapi_snapshot.xlsx, openapi.json${RESET}"
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
        logs)
            docker compose logs -f "$@"
            ;;
        restart)
            docker compose restart "$@"
            ;;
        *)
            echo "Unknown docker action: $ACTION. Supported: up, down, ps, logs, restart"
            ;;
    esac
}

# Command: View Logs
cmd_logs() {
    SERVICE="${1:-fastapi}"
    print_header
    echo -e "${BLUE}▶ Streaming logs for: $SERVICE (Press Ctrl+C to exit)...${RESET}\n"
    case "$SERVICE" in
        ingestion)
            tail -f -n 50 "$WORKSPACE_DIR/logs/ingestion_server.log" 2>/dev/null || tail -f -n 50 "$WORKSPACE_DIR/logs/app.log"
            ;;
        detect)
            tail -f -n 50 /home/r211admin/parking-detect/detect_worker.log 2>/dev/null || tail -f -n 50 "$WORKSPACE_DIR/logs/detect_worker.log"
            ;;
        frontend)
            tail -f -n 50 "$WORKSPACE_DIR/logs/frontend.log"
            ;;
        *)
            docker compose logs -f --tail=50 "$SERVICE"
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
    start-all|up|all)
        cmd_start_all
        ;;
    stop-all|down)
        cmd_stop_all
        ;;
    restart-all|restart)
        cmd_restart_all
        ;;
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
    logs)
        shift
        cmd_logs "$@"
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
