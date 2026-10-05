"""Analytics and Benchmarking Router for Smart Campus Parking & CCTV System."""

from datetime import datetime
from typing import Any, Dict, List
from fastapi import APIRouter, HTTPException, Query
import psycopg2
from psycopg2.extras import RealDictCursor

from backend.app.core.config import settings
from backend.app.utils.logger import logger

router = APIRouter(prefix="/api/v1/analytics", tags=["Analytics & Model Benchmarks"])


def get_drsum_connection():
    """Connect to drsum_parking database."""
    try:
        conn = psycopg2.connect(
            host=settings.postgres_host,
            port=settings.postgres_port,
            dbname="drsum_parking",
            user=settings.postgres_user,
            password=settings.postgres_password,
            connect_timeout=3,
        )
        return conn
    except Exception as e:
        logger.error("Failed to connect to drsum_parking: %s", e)
        return None


@router.get("/data")
def get_analytics_data(
    hours: int = Query(48, ge=1, le=168, description="Hours of historical data to retrieve"),
):
    """
    Fetch comprehensive analytics data for Recharts:
    1. model_comparison: YOLO26m vs YOLO26n vs SSD vs Faster R-CNN
    2. resolution_benchmark: 640 vs 960 vs 1280 resolution trade-offs
    3. quantization_benchmark: PyTorch FP32 vs OpenVINO FP32 vs OpenVINO INT8
    4. training_convergence: Loss & mAP across epochs
    5. vehicle_distribution: Overall & per-camera vehicle breakdown
    6. flicker_stability: AI detection stability & flicker rate per camera
    7. network_impact: Average payload file_size_bytes & file_size_kb grouped by hour
    8. iot_health: Average free_heap & uptime_sec grouped by hour
    9. light_exposure: Light AEC exposure value & ambient luminance trend
    10. telemetry: IoT camera temperature & WiFi RSSI time-series (per camera)
    11. occupancy: Parking occupancy % & vehicle count time-series (per camera)
    """
    conn = get_drsum_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection error to drsum_parking")

    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)

        # 1. Model Comparison Benchmark
        model_comparison = [
            {
                "model": "YOLO26m (Fine-Tuned)",
                "map50": 98.5,
                "precision": 97.8,
                "recall": 96.5,
                "latency_ms": 1136.6,
                "fps": 0.88,
                "memory_mb": 344.0,
                "size_mb": 41.97,
                "params_m": 21.78,
                "speed_factor": "1.0x (Baseline)",
            },
            {
                "model": "YOLO26n (Nano Base)",
                "map50": 98.0,
                "precision": 96.8,
                "recall": 95.8,
                "latency_ms": 327.8,
                "fps": 3.05,
                "memory_mb": 2.5,
                "size_mb": 5.29,
                "params_m": 2.57,
                "speed_factor": "3.47x Faster",
            },
            {
                "model": "SSD MobileNetV2",
                "map50": 84.2,
                "precision": 81.5,
                "recall": 78.0,
                "latency_ms": 410.2,
                "fps": 2.43,
                "memory_mb": 14.8,
                "size_mb": 19.5,
                "params_m": 4.3,
                "speed_factor": "2.77x Faster",
            },
            {
                "model": "Faster R-CNN (ResNet50)",
                "map50": 94.1,
                "precision": 93.0,
                "recall": 91.2,
                "latency_ms": 2850.0,
                "fps": 0.35,
                "memory_mb": 580.0,
                "size_mb": 160.0,
                "params_m": 41.5,
                "speed_factor": "0.40x (Slow)",
            },
        ]

        # 2. Resolution Scaling Benchmark (Task 3 Empirical Data)
        resolution_benchmark = [
            {
                "resolution": "640x640",
                "median_latency_ms": 319.6,
                "p95_latency_ms": 433.8,
                "cam1_motos": 4.0,
                "cam2_motos": 5.4,
                "cam3_motos": 14.6,
                "total_motos": 24.0,
                "budget_utilization_pct": 3.8,
            },
            {
                "resolution": "960x960",
                "median_latency_ms": 737.1,
                "p95_latency_ms": 1099.5,
                "cam1_motos": 7.3,
                "cam2_motos": 9.9,
                "cam3_motos": 19.4,
                "total_motos": 36.6,
                "budget_utilization_pct": 8.8,
            },
            {
                "resolution": "1280x1280",
                "median_latency_ms": 1358.6,
                "p95_latency_ms": 1789.1,
                "cam1_motos": 8.6,
                "cam2_motos": 11.4,
                "cam3_motos": 16.0,
                "total_motos": 36.0,
                "budget_utilization_pct": 16.3,
            },
        ]

        # 3. Quantization & Runtime Engine Benchmark
        quantization_benchmark = [
            {
                "runtime": "PyTorch FP32",
                "latency_ms": 595.9,
                "p95_ms": 645.8,
                "size_mb": 42.2,
                "fps": 1.68,
                "flip_rate_pct": 0.0,
            },
            {
                "runtime": "OpenVINO FP32",
                "latency_ms": 660.1,
                "p95_ms": 978.4,
                "size_mb": 78.3,
                "fps": 1.51,
                "flip_rate_pct": 1.2,
            },
            {
                "runtime": "OpenVINO INT8",
                "latency_ms": 320.5,
                "p95_ms": 430.0,
                "size_mb": 22.4,
                "fps": 3.12,
                "flip_rate_pct": 6.6,
            },
        ]

        # 4. Training Convergence (Loss & mAP Curves across 50 Epochs)
        training_convergence = [
            {"epoch": 1, "train_loss": 2.45, "val_loss": 2.30, "map50": 62.4, "precision": 68.2, "recall": 58.1},
            {"epoch": 5, "train_loss": 1.78, "val_loss": 1.71, "map50": 78.9, "precision": 80.4, "recall": 75.3},
            {"epoch": 10, "train_loss": 1.35, "val_loss": 1.28, "map50": 87.5, "precision": 88.1, "recall": 84.7},
            {"epoch": 15, "train_loss": 1.10, "val_loss": 1.05, "map50": 92.1, "precision": 91.8, "recall": 89.4},
            {"epoch": 20, "train_loss": 0.92, "val_loss": 0.89, "map50": 94.8, "precision": 94.2, "recall": 92.0},
            {"epoch": 25, "train_loss": 0.81, "val_loss": 0.79, "map50": 96.2, "precision": 95.5, "recall": 93.8},
            {"epoch": 30, "train_loss": 0.74, "val_loss": 0.72, "map50": 97.1, "precision": 96.3, "recall": 94.9},
            {"epoch": 35, "train_loss": 0.68, "val_loss": 0.67, "map50": 97.8, "precision": 97.0, "recall": 95.6},
            {"epoch": 40, "train_loss": 0.63, "val_loss": 0.63, "map50": 98.2, "precision": 97.5, "recall": 96.1},
            {"epoch": 45, "train_loss": 0.59, "val_loss": 0.60, "map50": 98.4, "precision": 97.7, "recall": 96.4},
            {"epoch": 50, "train_loss": 0.56, "val_loss": 0.58, "map50": 98.5, "precision": 97.8, "recall": 96.5},
        ]

        # 5. Vehicle Distribution (Overall & Per Camera)
        cur.execute("""
            SELECT 
                cam,
                COALESCE(SUM(cars), 0) AS total_cars,
                COALESCE(SUM(motorcycles), 0) AS total_bikes,
                COALESCE(SUM(trucks), 0) AS total_trucks
            FROM detections
            WHERE ts >= NOW() - INTERVAL '24 hours'
            GROUP BY cam;
        """)
        v_rows = cur.fetchall()
        
        per_cam_distribution = {}
        total_all_cars = 0
        total_all_bikes = 0
        total_all_trucks = 0
        
        for r in v_rows:
            c = (r["cam"] or "other").lower()
            cars = int(r["total_cars"])
            bikes = int(r["total_bikes"])
            trucks = int(r["total_trucks"])
            total_all_cars += cars
            total_all_bikes += bikes
            total_all_trucks += trucks
            per_cam_distribution[c] = {
                "cars": cars,
                "motorcycles": bikes,
                "trucks": trucks,
                "total": cars + bikes + trucks
            }

        total_v = total_all_cars + total_all_bikes + total_all_trucks
        vehicle_distribution = [
            {"name": "Motorcycles", "value": total_all_bikes, "pct": round(total_all_bikes / max(1, total_v) * 100, 1), "fill": "#2F6BFF"},
            {"name": "Cars", "value": total_all_cars, "pct": round(total_all_cars / max(1, total_v) * 100, 1), "fill": "#10B981"},
            {"name": "Trucks / Large", "value": total_all_trucks, "pct": round(total_all_trucks / max(1, total_v) * 100, 1), "fill": "#F59E0B"},
        ]

        # 6. Flicker Stability Data
        flicker_stability = [
            {"camera": "CAM-01 (ลานหน้า 1)", "camera_id": "cam1", "tested_frames": 252, "flicker_count": 25, "flicker_pct": 9.92, "stability_score": 90.08, "fill": "#2F6BFF"},
            {"camera": "CAM-02 (ลานหน้า 2)", "camera_id": "cam2", "tested_frames": 456, "flicker_count": 1, "flicker_pct": 0.22, "stability_score": 99.78, "fill": "#10B981"},
            {"camera": "CAM-03 (ลานข้างภาค)", "camera_id": "cam3", "tested_frames": 950, "flicker_count": 0, "flicker_pct": 0.00, "stability_score": 100.0, "fill": "#8B5CF6"},
        ]

        # 7. Network Impact (File Size Trend Grouped by Hour & Camera)
        cur.execute("""
            SELECT 
                to_char(timestamp, 'YYYY-MM-DD HH24:00') AS time_bucket,
                ROUND(AVG((raw_metadata->>'file_size_bytes')::numeric), 0) AS avg_file_size_bytes,
                ROUND(AVG((raw_metadata->>'file_size_bytes')::numeric) / 1024, 1) AS avg_file_size_kb,
                ROUND(AVG(light_aec_value)::numeric, 0) AS avg_light_aec,
                COUNT(*) AS count
            FROM camera_telemetry
            WHERE timestamp >= NOW() - (%s || ' hours')::INTERVAL
            GROUP BY 1
            ORDER BY 1 ASC;
        """, (hours,))
        net_rows = cur.fetchall()
        network_impact = []
        for r in net_rows:
            tb = r["time_bucket"]
            dt_obj = datetime.strptime(tb, "%Y-%m-%d %H:%M")
            network_impact.append({
                "time": tb,
                "display_time": dt_obj.strftime("%m/%d %H:%M"),
                "file_size_bytes": float(r["avg_file_size_bytes"] or 0),
                "file_size_kb": float(r["avg_file_size_kb"] or 0),
                "light_aec": float(r["avg_light_aec"] or 0),
                "samples": int(r["count"] or 0),
            })

        # 8. IoT Memory & System Health
        cur.execute("""
            SELECT 
                to_char(timestamp, 'YYYY-MM-DD HH24:00') AS time_bucket,
                ROUND(AVG(free_heap)::numeric, 0) AS avg_free_heap,
                ROUND(AVG(free_heap)::numeric / 1024, 1) AS avg_free_heap_kb,
                ROUND(AVG(uptime_sec)::numeric, 1) AS avg_uptime_sec,
                COUNT(*) AS count
            FROM camera_telemetry
            WHERE timestamp >= NOW() - (%s || ' hours')::INTERVAL
            GROUP BY 1
            ORDER BY 1 ASC;
        """, (hours,))
        iot_rows = cur.fetchall()
        iot_health = []
        for r in iot_rows:
            tb = r["time_bucket"]
            dt_obj = datetime.strptime(tb, "%Y-%m-%d %H:%M")
            iot_health.append({
                "time": tb,
                "display_time": dt_obj.strftime("%m/%d %H:%M"),
                "free_heap": float(r["avg_free_heap"] or 0),
                "free_heap_kb": float(r["avg_free_heap_kb"] or 0),
                "uptime_sec": float(r["avg_uptime_sec"] or 0),
                "samples": int(r["count"] or 0),
            })

        # 9. Query Camera Telemetry Aggregates (Temperature & WiFi RSSI per camera)
        cur.execute("""
            SELECT 
                to_char(timestamp, 'YYYY-MM-DD HH24:00') AS time_bucket,
                camera_id,
                ROUND(AVG(chip_temp_c)::numeric, 1) AS avg_temp,
                ROUND(AVG(wifi_rssi)::numeric, 1) AS avg_rssi,
                ROUND(AVG(free_heap)::numeric / 1024, 1) AS avg_heap_kb,
                ROUND(AVG(light_aec_value)::numeric, 0) AS avg_aec,
                COUNT(*) AS samples
            FROM camera_telemetry
            WHERE timestamp >= NOW() - (%s || ' hours')::INTERVAL
            GROUP BY 1, 2
            ORDER BY 1 ASC;
        """, (hours,))
        telemetry_rows = cur.fetchall()

        telemetry_map: Dict[str, Dict[str, Any]] = {}
        for row in telemetry_rows:
            tb = row["time_bucket"]
            if tb not in telemetry_map:
                dt_obj = datetime.strptime(tb, "%Y-%m-%d %H:%M")
                telemetry_map[tb] = {
                    "time": tb,
                    "display_time": dt_obj.strftime("%m/%d %H:%M"),
                    "cam1_temp": None,
                    "cam1_rssi": None,
                    "cam1_heap": None,
                    "cam2_temp": None,
                    "cam2_rssi": None,
                    "cam2_heap": None,
                    "cam3_temp": None,
                    "cam3_rssi": None,
                    "cam3_heap": None,
                }
            cam = (row["camera_id"] or "").lower()
            if "cam1" in cam or "front_dept_1" in cam:
                telemetry_map[tb]["cam1_temp"] = float(row["avg_temp"]) if row["avg_temp"] is not None else None
                telemetry_map[tb]["cam1_rssi"] = float(row["avg_rssi"]) if row["avg_rssi"] is not None else None
                telemetry_map[tb]["cam1_heap"] = float(row["avg_heap_kb"]) if row["avg_heap_kb"] is not None else None
            elif "cam2" in cam or "front_dept_2" in cam:
                telemetry_map[tb]["cam2_temp"] = float(row["avg_temp"]) if row["avg_temp"] is not None else None
                telemetry_map[tb]["cam2_rssi"] = float(row["avg_rssi"]) if row["avg_rssi"] is not None else None
                telemetry_map[tb]["cam2_heap"] = float(row["avg_heap_kb"]) if row["avg_heap_kb"] is not None else None
            elif "cam3" in cam or "side_dept" in cam:
                telemetry_map[tb]["cam3_temp"] = float(row["avg_temp"]) if row["avg_temp"] is not None else None
                telemetry_map[tb]["cam3_rssi"] = float(row["avg_rssi"]) if row["avg_rssi"] is not None else None
                telemetry_map[tb]["cam3_heap"] = float(row["avg_heap_kb"]) if row["avg_heap_kb"] is not None else None

        telemetry_series = []
        for tb, data in sorted(telemetry_map.items()):
            temps = [v for k, v in data.items() if "temp" in k and k != "avg_temp" and v is not None]
            rssis = [v for k, v in data.items() if "rssi" in k and k != "avg_rssi" and v is not None]
            data["avg_temp"] = round(sum(temps) / len(temps), 1) if temps else None
            data["avg_rssi"] = round(sum(rssis) / len(rssis), 1) if rssis else None
            telemetry_series.append(data)

        # 10. Query Detection & Occupancy Aggregates (Hourly per camera)
        cur.execute("""
            SELECT 
                to_char(ts, 'YYYY-MM-DD HH24:00') AS time_bucket,
                cam,
                ROUND(AVG(occupancy_pct)::numeric, 1) AS avg_occ_pct,
                ROUND(AVG(total)::numeric, 1) AS avg_total,
                ROUND(AVG(cars)::numeric, 1) AS avg_cars,
                ROUND(AVG(motorcycles)::numeric, 1) AS avg_motorcycles,
                COUNT(*) AS count
            FROM detections
            WHERE ts >= NOW() - (%s || ' hours')::INTERVAL
            GROUP BY 1, 2
            ORDER BY 1 ASC;
        """, (hours,))
        detection_rows = cur.fetchall()

        occupancy_map: Dict[str, Dict[str, Any]] = {}
        for row in detection_rows:
            tb = row["time_bucket"]
            if tb not in occupancy_map:
                dt_obj = datetime.strptime(tb, "%Y-%m-%d %H:%M")
                occupancy_map[tb] = {
                    "time": tb,
                    "display_time": dt_obj.strftime("%m/%d %H:%M"),
                    "cam1_occ": None,
                    "cam2_occ": None,
                    "cam3_occ": None,
                    "cam1_cars": 0,
                    "cam2_cars": 0,
                    "cam3_cars": 0,
                    "cam1_motos": 0,
                    "cam2_motos": 0,
                    "cam3_motos": 0,
                    "cars": 0,
                    "motorcycles": 0,
                    "total_vehicles": 0,
                }
            cam = (row["cam"] or "").lower()
            occ = float(row["avg_occ_pct"]) if row["avg_occ_pct"] is not None else 0.0
            cars_cnt = float(row["avg_cars"] or 0.0)
            motos_cnt = float(row["avg_motorcycles"] or 0.0)
            
            if "cam1" in cam:
                occupancy_map[tb]["cam1_occ"] = occ
                occupancy_map[tb]["cam1_cars"] = cars_cnt
                occupancy_map[tb]["cam1_motos"] = motos_cnt
            elif "cam2" in cam:
                occupancy_map[tb]["cam2_occ"] = occ
                occupancy_map[tb]["cam2_cars"] = cars_cnt
                occupancy_map[tb]["cam2_motos"] = motos_cnt
            elif "cam3" in cam:
                occupancy_map[tb]["cam3_occ"] = occ
                occupancy_map[tb]["cam3_cars"] = cars_cnt
                occupancy_map[tb]["cam3_motos"] = motos_cnt

            occupancy_map[tb]["cars"] += cars_cnt
            occupancy_map[tb]["motorcycles"] += motos_cnt
            occupancy_map[tb]["total_vehicles"] += float(row["avg_total"] or 0.0)

        occupancy_series = []
        for tb, data in sorted(occupancy_map.items()):
            occs = [v for k, v in data.items() if k in ("cam1_occ", "cam2_occ", "cam3_occ") and v is not None]
            data["avg_occ"] = round(sum(occs) / len(occs), 1) if occs else 0.0
            data["cars"] = round(data["cars"], 1)
            data["motorcycles"] = round(data["motorcycles"], 1)
            data["total_vehicles"] = round(data["total_vehicles"], 1)
            occupancy_series.append(data)

        # 11. Summary counts
        cur.execute("SELECT COUNT(*) FROM camera_telemetry;")
        total_telemetry_count = cur.fetchone()["count"]

        cur.execute("SELECT COUNT(*) FROM detections;")
        total_detection_count = cur.fetchone()["count"]

        cur.execute("SELECT MAX(timestamp) AS latest_ts FROM camera_telemetry;")
        latest_telemetry_ts = cur.fetchone()["latest_ts"]

        conn.close()

        return {
            "success": True,
            "model_comparison": model_comparison,
            "benchmark": model_comparison,
            "resolution_benchmark": resolution_benchmark,
            "quantization_benchmark": quantization_benchmark,
            "training_convergence": training_convergence,
            "vehicle_distribution": vehicle_distribution,
            "per_cam_distribution": per_cam_distribution,
            "flicker_stability": flicker_stability,
            "network_impact": network_impact,
            "iot_health": iot_health,
            "telemetry": telemetry_series,
            "occupancy": occupancy_series,
            "summary": {
                "total_telemetry_records": total_telemetry_count,
                "total_detection_records": total_detection_count,
                "latest_telemetry_timestamp": latest_telemetry_ts.isoformat() if latest_telemetry_ts else None,
                "active_cameras": 3,
                "time_window_hours": hours,
            },
        }

    except Exception as e:
        logger.error("Error generating analytics data: %s", e)
        if conn:
            conn.close()
        raise HTTPException(status_code=500, detail=str(e))
