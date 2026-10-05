"""
FastAPI Router for Thermal-Aware Time-Series & Adaptive Deep-Sleep Policy.
"""

import json
import logging
from typing import Any, Dict, Optional

from fastapi import APIRouter, Query

from backend.app.services.timeseries_service import timeseries_service

try:
    import redis
    redis_client = redis.Redis(host="localhost", port=6379, db=0, decode_responses=True, socket_timeout=1)
except Exception:
    redis_client = None

router = APIRouter(prefix="/api/v1/timeseries", tags=["Time-Series Adaptive Sleep"])
logger = logging.getLogger(__name__)


def _get_live_telemetry(camera_id: str) -> Dict[str, Any]:
    """Retrieve hot telemetry from Redis RAM cache if available."""
    if not redis_client:
        return {}
    try:
        raw = redis_client.get(f"camera:{camera_id}:telemetry")
        if raw:
            return json.loads(raw)
    except Exception as e:
        logger.debug("Redis read error for %s: %s", camera_id, e)
    return {}


@router.get("/recommend-sleep", summary="Get Recommended Deep-Sleep Duration")
def recommend_sleep(
    camera_id: str = Query("cam1", description="Camera ID (e.g. cam1, cam2, cam3)"),
    chip_temp_c: Optional[float] = Query(None, description="Current chip temperature in Celsius (optional override)"),
    delta_vehicles: Optional[float] = Query(None, description="Vehicle rate of change (+ arrival, - departure)"),
    light_aec: Optional[float] = Query(None, description="Light exposure value AEC"),
):
    """
    Computes optimal deep sleep interval for ESP32 camera hardware.
    Considers thermal budget, daytime traffic rush hours, and vehicle arrival dynamics.
    """
    telemetry = _get_live_telemetry(camera_id)
    if chip_temp_c is not None:
        telemetry["chip_temp_c"] = chip_temp_c
    if light_aec is not None:
        telemetry["light_aec_value"] = light_aec

    occupancy_info = {}
    if delta_vehicles is not None:
        occupancy_info["delta_vehicles"] = delta_vehicles

    result = timeseries_service.compute_optimal_sleep(
        camera_id=camera_id,
        current_telemetry=telemetry,
        occupancy_info=occupancy_info,
    )
    return {
        "status": "success",
        "data": result,
    }


@router.get("/thermal-prediction", summary="Predict Chip Thermal Dynamics")
def thermal_prediction(
    camera_id: str = Query("cam1", description="Camera ID"),
    chip_temp_c: Optional[float] = Query(None, description="Current chip temperature"),
):
    """
    Predicts the future ESP32 chip temperature on the next wake cycle given the current thermal state.
    """
    telemetry = _get_live_telemetry(camera_id)
    if chip_temp_c is not None:
        telemetry["chip_temp_c"] = chip_temp_c

    result = timeseries_service.compute_optimal_sleep(
        camera_id=camera_id,
        current_telemetry=telemetry,
    )
    return {
        "status": "success",
        "camera_id": camera_id,
        "current_temp_c": result["current_temp_c"],
        "predicted_next_temp_c": result["predicted_next_temp_c"],
        "delta_c": round(result["predicted_next_temp_c"] - result["current_temp_c"], 1),
        "thermal_status": result["thermal_status"],
        "cooling_strategy": result["reason"],
    }


@router.get("/model-metrics", summary="Model Performance & Feature Importance")
def get_model_metrics():
    """Returns training metrics, R2 scores, MAE, and feature importances for timeseries models."""
    return {
        "status": "success",
        "metadata": timeseries_service.metadata,
    }


@router.get("/cameras/status", summary="Real-time Thermal & Sleep Status Across All Cameras")
def get_all_cameras_status():
    """
    Polls real-time telemetry from Redis RAM for cam1, cam2, cam3 and returns
    thermal risk status and adaptive sleep interval for each camera.
    """
    cameras = ["cam1", "cam2", "cam3"]
    status_map = {}
    for cam in cameras:
        telemetry = _get_live_telemetry(cam)
        rec = timeseries_service.compute_optimal_sleep(cam, current_telemetry=telemetry)
        status_map[cam] = rec

    return {
        "status": "success",
        "cameras": status_map,
    }


@router.get("/future-occupancy", summary="Predict Parking Availability (15m & 30m Horizon)")
def predict_future_occupancy(
    camera_id: str = Query("cam1", description="Camera ID (cam1, cam2, cam3)"),
    minutes: int = Query(15, ge=5, le=60, description="Forecast horizon in minutes (e.g. 15 or 30)"),
):
    """
    Predicts parking occupancy and free slot probability in the next 15 or 30 minutes,
    leveraging time-of-day, campus schedule phases, and rush-hour dynamics.
    """
    # Fetch live occupancy from Redis or fallback
    current_vehicles = 0
    if redis_client:
        try:
            raw_occ = redis_client.get(f"parking:{camera_id}:live") or redis_client.get(f"parking:{camera_id}:status")
            if raw_occ:
                d = json.loads(raw_occ)
                current_vehicles = int(d.get("occupied", d.get("total_vehicles", 0)))
        except Exception:
            pass

    prediction = timeseries_service.predict_future_occupancy(
        camera_id=camera_id,
        horizon_minutes=minutes,
        current_vehicles=current_vehicles,
    )
    return {
        "status": "success",
        "data": prediction,
    }


@router.get("/graph-data", summary="Time-Series Data for Dashboard Recharts Visualization")
def get_timeseries_graph_data(
    hours: int = Query(48, ge=1, le=168, description="Hours of historical data to retrieve"),
    camera_id: str = Query("all", description="Camera ID filter or 'all'"),
):
    """
    Returns time-aligned series containing:
      - chip_temp (°C)
      - total_vehicles
      - recommended_sleep_sec
      - light_aec_value
      - campus_phase_name
    """
    from datetime import datetime, timedelta, timezone
    import psycopg2
    from psycopg2.extras import RealDictCursor
    from backend.app.core.config import settings

    try:
        conn = psycopg2.connect(
            host=settings.postgres_host,
            port=settings.postgres_port,
            dbname="drsum_parking",
            user=settings.postgres_user,
            password=settings.postgres_password,
            connect_timeout=3,
        )
    except Exception as err:
        return {"status": "error", "message": f"Database error: {err}", "series": []}

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)

        # 1. Telemetry hourly averages
        cam_filter_sql = ""
        params_tel = [hours]
        if camera_id != "all":
            cam_filter_sql = "AND LOWER(camera_id) LIKE %s"
            params_tel.append(f"%{camera_id}%")

        cur.execute(f"""
            SELECT 
                to_char(timestamp, 'YYYY-MM-DD HH24:00') AS time_bucket,
                ROUND(AVG(chip_temp_c)::numeric, 1) AS avg_temp,
                ROUND(AVG(light_aec_value)::numeric, 0) AS avg_aec,
                ROUND(AVG(wifi_rssi)::numeric, 0) AS avg_rssi
            FROM camera_telemetry
            WHERE timestamp >= NOW() - (%s || ' hours')::INTERVAL
              AND chip_temp_c IS NOT NULL
              {cam_filter_sql}
            GROUP BY 1
            ORDER BY 1 ASC;
        """, tuple(params_tel))
        tel_rows = {r["time_bucket"]: r for r in cur.fetchall()}

        # 2. Detections hourly averages
        params_det = [hours]
        cam_filter_det = ""
        if camera_id != "all":
            cam_filter_det = "AND LOWER(cam) LIKE %s"
            params_det.append(f"%{camera_id}%")

        cur.execute(f"""
            SELECT 
                to_char(ts, 'YYYY-MM-DD HH24:00') AS time_bucket,
                ROUND(AVG(total)::numeric, 1) AS avg_vehicles,
                ROUND(AVG(occupancy_pct)::numeric, 1) AS avg_occ
            FROM detections
            WHERE ts >= NOW() - (%s || ' hours')::INTERVAL
              {cam_filter_det}
            GROUP BY 1
            ORDER BY 1 ASC;
        """, tuple(params_det))
        det_rows = {r["time_bucket"]: r for r in cur.fetchall()}

        conn.close()

        # Combine into aligned time-series
        all_buckets = sorted(set(list(tel_rows.keys()) + list(det_rows.keys())))
        bkk_tz = timezone(timedelta(hours=7))

        series = []
        for tb in all_buckets:
            t_data = tel_rows.get(tb, {})
            d_data = det_rows.get(tb, {})
            dt_obj = datetime.strptime(tb, "%Y-%m-%d %H:%M").replace(tzinfo=timezone.utc).astimezone(bkk_tz)

            temp = float(t_data.get("avg_temp") or 52.0)
            aec = float(t_data.get("avg_aec") or 1200.0)
            rssi = float(t_data.get("avg_rssi") or -70.0)
            v_cnt = float(d_data.get("avg_vehicles") or 0.0)
            occ_p = float(d_data.get("avg_occ") or 0.0)

            # Compute simulated optimal sleep for this historic bucket
            h = dt_obj.hour
            m = dt_obj.minute
            is_wknd = 1 if dt_obj.weekday() in (5, 6) else 0

            # Derive simulated sleep policy
            if temp >= 68.0:
                sleep_s = 60
            elif temp >= 62.0:
                sleep_s = 45
            elif (v_cnt > 0) and temp < 58.0:
                sleep_s = 10
            elif is_wknd == 1:
                sleep_s = 40
            else:
                sleep_s = 30

            series.append({
                "time": tb,
                "display_time": dt_obj.strftime("%m/%d %H:%M"),
                "hour": h,
                "chip_temp_c": temp,
                "light_aec_value": aec,
                "wifi_rssi": rssi,
                "total_vehicles": v_cnt,
                "occupancy_pct": occ_p,
                "recommended_sleep_sec": sleep_s,
                "is_weekend": bool(is_wknd),
            })

        return {
            "status": "success",
            "camera_id": camera_id,
            "hours": hours,
            "count": len(series),
            "series": series,
            "metadata": timeseries_service.metadata,
        }
    except Exception as e:
        logger.error("Error generating timeseries graph data: %s", e)
        if conn:
            conn.close()
        return {"status": "error", "message": str(e), "series": []}
