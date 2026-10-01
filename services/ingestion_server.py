"""
Smart Campus Parking Ecosystem - 3-Camera Enterprise Data Lake Ingestion Server
Dr. Sum Parking Density Analytics Platform
Dual-Storage: Local Filesystem (Time-Partitioned) + MinIO Object Storage (Bucket: raw-datasets)

Requested Time-Partitioning Structure:
  - Local Disk: data/dataset/<camera_id>/<YYYY-MM-DD>/<HH>/images/<timestamp>.jpg
                data/dataset/<camera_id>/<YYYY-MM-DD>/<HH>/json/<timestamp>.json
  - MinIO:      raw-datasets/dataset/<camera_id>/<YYYY-MM-DD>/<HH>/images/<timestamp>.jpg
                raw-datasets/dataset/<camera_id>/<YYYY-MM-DD>/<HH>/json/<timestamp>.json

Active Cameras:
  - cam1: front_dept_1 (หน้าภาค 1 - รถยนต์) [IP: 172.30.91.44]
  - cam2: front_dept_2 (หน้าภาค 2 - รถยนต์) [IP: 172.30.92.108]
  - cam3: side_dept    (ข้างภาคคอม - มอเตอร์ไซค์) [IP: 172.30.92.100]

Telemetry Support: Header X-Telemetry (aec_value, rssi, temp, etc.) recorded in companion .json
APIs: /status, /api/telemetry, /api/health, /api/upload, /api/latest, /api/settings, /gallery
"""

import io
import json
import logging
import os
import shutil
import socket
from datetime import datetime, timedelta
from pathlib import Path
from flask import Flask, request, jsonify, send_file, render_template_string
from minio import Minio
from PIL import Image, ImageEnhance
import psutil
import psycopg2
from psycopg2.extras import Json

BASE_DIR = Path(__file__).resolve().parent.parent
CONFIG_PATH = BASE_DIR / "config.json"

DEFAULT_CONFIG = {
    "server": {
        "host": "0.0.0.0",
        "port": 5005,
        "upload_interval_sec": 15,
        "max_content_length_mb": 16,
    },
    "locations": {
        "front_dept_1": {
            "id": "front_dept_1",
            "camera_id": "cam1",
            "name": "หน้าภาค 1 (รถยนต์)",
            "target": "car",
            "capacity": 10,
            "folder": "data/dataset/cam1",
            "aliases": ["cam1", "front_dept_1", "front1", "front_dept"],
            "rotation": 180,
            "brightness": 0.82,
            "contrast": 1.15,
            "interval_sec": 15,
        },
        "front_dept_2": {
            "id": "front_dept_2",
            "camera_id": "cam2",
            "name": "หน้าภาค 2 (รถยนต์)",
            "target": "car",
            "capacity": 10,
            "folder": "data/dataset/cam2",
            "aliases": ["cam2", "front_dept_2", "front2"],
            "rotation": 180,
            "brightness": 0.82,
            "contrast": 1.15,
            "interval_sec": 15,
        },
        "side_dept": {
            "id": "side_dept",
            "camera_id": "cam3",
            "name": "ข้างภาคคอม (มอเตอร์ไซค์)",
            "target": "motorcycle",
            "capacity": 20,
            "folder": "data/dataset/cam3",
            "aliases": ["cam3", "cam4", "side_dept", "side_dept_1", "side_dept_2", "side", "side1", "side2"],
            "rotation": 180,
            "brightness": 0.80,
            "contrast": 1.15,
            "interval_sec": 15,
        },
    },
    "database": {
        "type": "postgresql",
        "host": "localhost",
        "port": 5432,
        "dbname": "drsum_parking",
        "user": "parking_user",
        "password": "parkingpass123",
    },
}

if CONFIG_PATH.exists():
    try:
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            CONFIG = json.load(f)
    except Exception:
        CONFIG = DEFAULT_CONFIG
else:
    CONFIG = DEFAULT_CONFIG

SERVER_CONFIG = CONFIG.get("server", DEFAULT_CONFIG["server"])
LOCATIONS = CONFIG.get("locations", DEFAULT_CONFIG["locations"])

# Ensure data/dataset/<camera_id> directories exist
DATA_DATASET_DIR = BASE_DIR / "data" / "dataset"
DATA_DATASET_DIR.mkdir(parents=True, exist_ok=True)
for loc_key, loc_val in LOCATIONS.items():
    cam_id = loc_val.get("camera_id", loc_key)
    (DATA_DATASET_DIR / cam_id).mkdir(parents=True, exist_ok=True)

# Build alias mapping
ALIAS_MAP = {}
for loc_key, loc_val in LOCATIONS.items():
    ALIAS_MAP[loc_key.lower()] = loc_key
    cam_id = loc_val.get("camera_id", "")
    if cam_id:
        ALIAS_MAP[cam_id.lower()] = loc_key
    for alias in loc_val.get("aliases", []):
        ALIAS_MAP[alias.lower()] = loc_key

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("ingestion_server")

# MinIO Client Configuration
MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "localhost:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ROOT_USER", "minioadmin")
MINIO_SECRET_KEY = os.getenv("MINIO_ROOT_PASSWORD", "minioadmin")
MINIO_BUCKET = os.getenv("MINIO_BUCKET_DATASETS", "raw-datasets")

minio_client = None
try:
    minio_client = Minio(
        MINIO_ENDPOINT,
        access_key=MINIO_ACCESS_KEY,
        secret_key=MINIO_SECRET_KEY,
        secure=False,
    )
    if not minio_client.bucket_exists(MINIO_BUCKET):
        minio_client.make_bucket(MINIO_BUCKET)
    logger.info("MinIO client connected successfully to %s (bucket: %s)", MINIO_ENDPOINT, MINIO_BUCKET)
except Exception as e:
    logger.error("Failed to initialize MinIO client: %s", e)
    minio_client = None

# PostgreSQL Database Configuration
DB_CONFIG = CONFIG.get("database", DEFAULT_CONFIG.get("database", {}))

def get_pg_connection():
    try:
        conn = psycopg2.connect(
            host=DB_CONFIG.get("host", "localhost"),
            port=DB_CONFIG.get("port", 5432),
            dbname=DB_CONFIG.get("dbname", "drsum_parking"),
            user=DB_CONFIG.get("user", "parking_user"),
            password=DB_CONFIG.get("password", "parkingpass123"),
            connect_timeout=3,
        )
        conn.autocommit = True
        return conn
    except Exception as e:
        logger.error("PostgreSQL connection error: %s", e)
        return None

def test_pg_connection():
    conn = get_pg_connection()
    if conn:
        conn.close()
        return True
    return False

def record_telemetry_to_postgres(location, camera_id, image_path, minio_url, json_path, minio_json_url, telemetry_dict, full_payload):
    conn = get_pg_connection()
    if not conn:
        return False
    try:
        with conn.cursor() as cur:
            light_aec = telemetry_dict.get("aec_value") or telemetry_dict.get("aec")
            brightness = telemetry_dict.get("brightness")
            contrast = telemetry_dict.get("contrast")
            saturation = telemetry_dict.get("saturation")
            sharpness = telemetry_dict.get("sharpness")
            rssi = telemetry_dict.get("wifi_rssi_dbm") or telemetry_dict.get("rssi")
            chip_temp = telemetry_dict.get("chip_temp_c") or telemetry_dict.get("temp_c") or telemetry_dict.get("temperature")
            uptime = telemetry_dict.get("uptime_sec") or telemetry_dict.get("uptime")
            free_heap = telemetry_dict.get("free_heap")

            cur.execute("""
                INSERT INTO camera_telemetry (
                    timestamp, location, camera_id, image_path, minio_url,
                    json_path, minio_json_url,
                    light_aec_value, brightness, contrast, saturation, sharpness,
                    wifi_rssi, chip_temp_c, uptime_sec, free_heap, raw_metadata
                ) VALUES (
                    CURRENT_TIMESTAMP, %s, %s, %s, %s,
                    %s, %s,
                    %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s
                )
            """, (
                location, camera_id, str(image_path), minio_url,
                str(json_path), minio_json_url,
                light_aec, brightness, contrast, saturation, sharpness,
                rssi, chip_temp, uptime, free_heap, Json(full_payload)
            ))
        conn.close()
        return True
    except Exception as e:
        logger.error("Failed to insert telemetry to PostgreSQL: %s", e)
        if conn:
            try: conn.close()
            except Exception: pass
        return False

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = SERVER_CONFIG.get("max_content_length_mb", 16) * 1024 * 1024

@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "*"
    return response

STATS = {
    loc: {
        "id": loc,
        "camera_id": LOCATIONS[loc].get("camera_id", loc),
        "name": LOCATIONS[loc].get("name", loc),
        "target": LOCATIONS[loc].get("target", "unknown"),
        "capacity": LOCATIONS[loc].get("capacity", 10),
        "count": 0,
        "latest_filename": None,
        "latest_timestamp": None,
        "latest_size_bytes": 0,
        "latest_filepath": None,
        "latest_partition": None,
        "minio_uploaded_count": 0,
        "minio_latest_path": None,
        "postgres_count": 0,
    }
    for loc in LOCATIONS
}

LATEST_TELEMETRY = {loc: {} for loc in LOCATIONS}
for loc, loc_val in LOCATIONS.items():
    cam_id = loc_val.get("camera_id")
    if cam_id:
        LATEST_TELEMETRY[cam_id] = {}

def scan_initial_files():
    """Scan existing files in data/dataset/ and fallback to 4camera/ or raw_images/ if needed."""
    now = datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    hour_str = now.strftime("%H")

    legacy_lookup = {
        "cam1": [BASE_DIR / "data" / "4camera" / "cam1", BASE_DIR / "data" / "raw_images" / "cam1"],
        "cam2": [BASE_DIR / "data" / "4camera" / "cam2", BASE_DIR / "data" / "raw_images" / "cam1"],
        "cam3": [BASE_DIR / "data" / "4camera" / "cam4", BASE_DIR / "data" / "4camera" / "cam3", BASE_DIR / "data" / "raw_images" / "cam2"],
    }

    for loc, loc_val in LOCATIONS.items():
        cam_id = loc_val.get("camera_id", loc)
        folder = DATA_DATASET_DIR / cam_id
        folder.mkdir(parents=True, exist_ok=True)

        files = sorted(list(folder.glob("**/*.jpg")), key=os.path.getmtime)

        # Seed from latest available image if dataset/<cam_id> is empty
        if not files:
            for leg_folder in legacy_lookup.get(cam_id, []):
                if leg_folder.exists():
                    leg_files = sorted(list(leg_folder.glob("**/*.jpg")), key=os.path.getmtime)
                    if leg_files:
                        src_jpg = leg_files[-1]
                        dest_img_dir = folder / date_str / hour_str / "images"
                        dest_json_dir = folder / date_str / hour_str / "json"
                        dest_img_dir.mkdir(parents=True, exist_ok=True)
                        dest_json_dir.mkdir(parents=True, exist_ok=True)

                        dest_jpg = dest_img_dir / src_jpg.name
                        shutil.copy2(src_jpg, dest_jpg)

                        src_json = src_jpg.with_suffix(".json")
                        if src_json.exists():
                            shutil.copy2(src_json, dest_json_dir / (src_jpg.stem + ".json"))
                        files = [dest_jpg]
                        logger.info("Seeded initial frame for %s (%s) from %s", loc, cam_id, src_jpg.name)
                        break

        if files:
            latest_f = files[-1]
            STATS[loc]["count"] = len(files)
            STATS[loc]["latest_filename"] = latest_f.name
            STATS[loc]["latest_timestamp"] = datetime.fromtimestamp(latest_f.stat().st_mtime).isoformat()
            STATS[loc]["latest_size_bytes"] = latest_f.stat().st_size
            STATS[loc]["latest_filepath"] = str(latest_f)
            STATS[loc]["minio_uploaded_count"] = len(files)
            STATS[loc]["latest_partition"] = f"{date_str}/{hour_str}"

            json_cand = latest_f.parent.parent / "json" / (latest_f.stem + ".json")
            if not json_cand.exists():
                json_cand = latest_f.with_suffix(".json")
            if json_cand.exists():
                try:
                    with open(json_cand, "r", encoding="utf-8") as jf:
                        tele = json.load(jf)
                        LATEST_TELEMETRY[loc] = tele
                        LATEST_TELEMETRY[cam_id] = tele
                except Exception:
                    pass

scan_initial_files()

# Initialize postgres count from DB
_pg_conn = get_pg_connection()
if _pg_conn:
    try:
        with _pg_conn.cursor() as _cur:
            for loc, loc_val in LOCATIONS.items():
                cam_id = loc_val.get("camera_id", loc)
                _cur.execute(
                    "SELECT COUNT(*) FROM camera_telemetry WHERE location = %s OR camera_id = %s OR camera_id = %s",
                    (loc, cam_id, "cam4" if cam_id == "cam3" else cam_id)
                )
                res = _cur.fetchone()
                STATS[loc]["postgres_count"] = res[0] if res else 0
    except Exception as e:
        logger.warning("Could not pre-fetch postgres count: %s", e)
    finally:
        _pg_conn.close()

def get_local_ips():
    ips = []
    try:
        for ip in socket.gethostbyname_ex(socket.gethostname())[2]:
            if not ip.startswith("127."):
                ips.append(ip)
    except Exception:
        pass
    return ips

@app.route("/", methods=["GET"])
@app.route("/api/health", methods=["GET"])
@app.route("/status", methods=["GET"])
def status():
    cpu_pct = psutil.cpu_percent(interval=None)
    mem = psutil.virtual_memory()
    disk = psutil.disk_usage(str(BASE_DIR))
    return jsonify({
        "status": "healthy",
        "service_status": "online",
        "service": "Dr. Sum Smart Campus Parking 3-Camera Enterprise Data Lake",
        "server_ips": get_local_ips(),
        "port": 5005,
        "cameras_configured": 3,
        "time_partitioning": "data/dataset/<camera_id>/<YYYY-MM-DD>/<HH>/[images|json]/",
        "minio": {
            "connected": minio_client is not None,
            "endpoint": MINIO_ENDPOINT,
            "bucket": MINIO_BUCKET,
            "prefix": "dataset/<camera_id>/<YYYY-MM-DD>/<HH>/[images|json]/",
        },
        "postgres": {
            "connected": test_pg_connection(),
            "database": DB_CONFIG.get("dbname", "drsum_parking"),
            "table": "camera_telemetry",
        },
        "system": {
            "cpu_percent": cpu_pct,
            "memory_used_mb": round((mem.total - mem.available) / (1024 * 1024), 1),
            "memory_total_mb": round(mem.total / (1024 * 1024), 1),
            "disk_free_gb": round(disk.free / (1024 * 1024 * 1024), 2),
        },
        "stats": STATS,
    })

def resolve_location(raw_loc: str, camera_id_param: str, client_ip: str = "") -> str:
    """Intelligently map incoming request to one of the 3 active cameras."""
    raw_loc = (raw_loc or "").strip().lower()
    camera_id_param = (camera_id_param or "").strip().lower()

    # Hardware IP-based definitive routing:
    if client_ip == "172.30.91.44":
        return "front_dept_1"
    elif client_ip == "172.30.92.108":
        return "front_dept_2"
    elif client_ip == "172.30.92.100" or client_ip == "172.30.91.205" or client_ip == "172.30.94.245":
        return "side_dept"

    # Location / camera_id parameter routing:
    if "side" in raw_loc or camera_id_param in ["cam3", "cam4"]:
        return "side_dept"
    elif "2" in raw_loc or camera_id_param == "cam2":
        return "front_dept_2"
    elif "front" in raw_loc or camera_id_param == "cam1":
        return "front_dept_1"

    return ALIAS_MAP.get(raw_loc, "front_dept_1")

@app.route("/api/telemetry", methods=["GET"])
def get_telemetry():
    loc_param = request.args.get("location") or request.args.get("camera_id")
    if loc_param:
        canonical_loc = resolve_location(loc_param, loc_param)
        return jsonify(LATEST_TELEMETRY.get(canonical_loc, {}))
    return jsonify(LATEST_TELEMETRY)

@app.route("/api/upload", methods=["POST"])
def upload():
    raw_loc = request.args.get("location") or request.form.get("location") or ""
    camera_id_param = request.args.get("camera_id") or request.form.get("camera_id") or ""
    client_ip = request.remote_addr or ""
    loc = resolve_location(raw_loc, camera_id_param, client_ip)
    cam_id = LOCATIONS[loc].get("camera_id", loc)

    image_bytes = request.files.get("image").read() if request.files else request.get_data()
    if not image_bytes:
        return jsonify({"success": False, "error": "No image data"}), 400

    now = datetime.now()
    date_str = now.strftime("%Y-%m-%d")
    hour_str = now.strftime("%H")
    timestamp_str = now.strftime("%Y-%m-%d_%H-%M-%S_%f")[:23]

    jpg_filename = f"{timestamp_str}.jpg"
    json_filename = f"{timestamp_str}.json"

    # Requested Structure: data/dataset/<camera_id>/<YYYY-MM-DD>/<HH>/images & json
    images_dir = DATA_DATASET_DIR / cam_id / date_str / hour_str / "images"
    json_dir = DATA_DATASET_DIR / cam_id / date_str / hour_str / "json"
    images_dir.mkdir(parents=True, exist_ok=True)
    json_dir.mkdir(parents=True, exist_ok=True)

    dest_jpg = images_dir / jpg_filename
    dest_json = json_dir / json_filename

    # Image Enhancement: Rotation, Brightness & Contrast
    rotation = LOCATIONS.get(loc, {}).get("rotation", 0)
    brightness = float(LOCATIONS.get(loc, {}).get("brightness", 1.0))
    contrast = float(LOCATIONS.get(loc, {}).get("contrast", 1.0))

    if rotation != 0 or brightness != 1.0 or contrast != 1.0:
        try:
            with Image.open(io.BytesIO(image_bytes)) as im:
                if rotation != 0:
                    im = im.rotate(rotation, expand=True)
                if brightness != 1.0:
                    im = ImageEnhance.Brightness(im).enhance(brightness)
                if contrast != 1.0:
                    im = ImageEnhance.Contrast(im).enhance(contrast)
                out_buf = io.BytesIO()
                im.save(out_buf, format="JPEG", quality=92)
                image_bytes = out_buf.getvalue()
            logger.info(">>> [%s/%s] Enhanced: rot=%d, brightness=%.2f, contrast=%.2f",
                        loc, cam_id, rotation, brightness, contrast)
        except Exception as re:
            logger.error("Failed to enhance image for %s: %s", loc, re)

    with open(dest_jpg, "wb") as f:
        f.write(image_bytes)

    # Telemetry Extraction from Header `X-Telemetry`
    raw_telemetry = (
        request.headers.get("X-Telemetry") or
        request.headers.get("x-telemetry") or
        request.form.get("telemetry") or
        request.args.get("telemetry")
    )
    telemetry_dict = {}
    if raw_telemetry:
        try:
            telemetry_dict = json.loads(raw_telemetry)
        except Exception:
            telemetry_dict = {"raw": raw_telemetry}
    else:
        # Fallback for individual headers (e.g. X-RSSI, X-Chip-Temp)
        rssi_hdr = request.headers.get("X-RSSI") or request.headers.get("x-rssi")
        temp_hdr = request.headers.get("X-Chip-Temp") or request.headers.get("x-chip-temp")
        if rssi_hdr or temp_hdr:
            try:
                if rssi_hdr:
                    telemetry_dict["wifi_rssi_dbm"] = int(rssi_hdr)
                if temp_hdr:
                    telemetry_dict["chip_temp_c"] = float(temp_hdr)
            except Exception:
                pass

    telemetry_payload = {
        "camera_id": cam_id,
        "folder": cam_id,
        "location": loc,
        "location_name": LOCATIONS.get(loc, {}).get("name", loc),
        "target": LOCATIONS.get(loc, {}).get("target", "unknown"),
        "capacity": LOCATIONS.get(loc, {}).get("capacity", 10),
        "timestamp": now.isoformat(),
        "partition": {
            "date": date_str,
            "hour": hour_str,
        },
        "filename": jpg_filename,
        "json_filename": json_filename,
        "file_size_bytes": len(image_bytes),
        "client_ip": client_ip,
        "image_enhancement": {
            "rotation": rotation,
            "brightness": brightness,
            "contrast": contrast,
        },
        "telemetry": telemetry_dict,
    }

    with open(dest_json, "w", encoding="utf-8") as jf:
        json.dump(telemetry_payload, jf, indent=2, ensure_ascii=False)

    LATEST_TELEMETRY[loc] = telemetry_payload
    LATEST_TELEMETRY[cam_id] = telemetry_payload

    # MinIO Structure: dataset/<camera_id>/<YYYY-MM-DD>/<HH>/images/<jpg_filename>
    #                  dataset/<camera_id>/<YYYY-MM-DD>/<HH>/json/<json_filename>
    minio_uploaded = False
    minio_jpg_path = f"dataset/{cam_id}/{date_str}/{hour_str}/images/{jpg_filename}"
    minio_json_path = f"dataset/{cam_id}/{date_str}/{hour_str}/json/{json_filename}"

    if minio_client:
        try:
            minio_client.put_object(
                bucket_name=MINIO_BUCKET,
                object_name=minio_jpg_path,
                data=io.BytesIO(image_bytes),
                length=len(image_bytes),
                content_type="image/jpeg",
            )
            json_bytes = json.dumps(telemetry_payload, indent=2, ensure_ascii=False).encode("utf-8")
            minio_client.put_object(
                bucket_name=MINIO_BUCKET,
                object_name=minio_json_path,
                data=io.BytesIO(json_bytes),
                length=len(json_bytes),
                content_type="application/json",
            )
            minio_uploaded = True
            STATS[loc]["minio_uploaded_count"] += 1
            STATS[loc]["minio_latest_path"] = minio_jpg_path
        except Exception as me:
            logger.error("MinIO upload failed for %s: %s", jpg_filename, me)

    minio_jpg_url = f"s3://{MINIO_BUCKET}/{minio_jpg_path}" if minio_uploaded else None
    minio_json_url = f"s3://{MINIO_BUCKET}/{minio_json_path}" if minio_uploaded else None
    postgres_recorded = record_telemetry_to_postgres(
        location=loc,
        camera_id=cam_id,
        image_path=dest_jpg,
        minio_url=minio_jpg_url,
        json_path=dest_json,
        minio_json_url=minio_json_url,
        telemetry_dict=telemetry_dict,
        full_payload=telemetry_payload
    )
    if postgres_recorded:
        STATS[loc]["postgres_count"] += 1

    STATS[loc]["count"] += 1
    STATS[loc]["latest_filename"] = jpg_filename
    STATS[loc]["latest_timestamp"] = now.isoformat()
    STATS[loc]["latest_size_bytes"] = len(image_bytes)
    STATS[loc]["latest_filepath"] = str(dest_jpg)
    STATS[loc]["latest_partition"] = f"{date_str}/{hour_str}"

    logger.info(">>> [%s/%s] Saved: %s/%s/%s (%d bytes) | MinIO: %s | Postgres: %s from %s", 
                loc, cam_id, date_str, hour_str, jpg_filename, len(image_bytes), 
                "OK" if minio_uploaded else "FAILED",
                "OK" if postgres_recorded else "FAILED",
                client_ip)

    # Hardware Deep Sleep & Interval Calculation:
    # Always include deep_sleep_sec = 15 regardless of day or night so ESP32-CAM enters hardware deep sleep
    deep_sleep_sec = 15
    interval_sec = LOCATIONS.get(loc, {}).get(
        "interval_sec",
        SERVER_CONFIG.get("upload_interval_sec", 15)
    )
    interval_ms = interval_sec * 1000

    response_payload = {
        "status": "success",
        "success": True,
        "interval_sec": interval_sec,
        "interval_ms": interval_ms,
        "deep_sleep_sec": deep_sleep_sec,
        "camera_id": cam_id,
        "folder": cam_id,
        "location": loc,
        "partition": f"{date_str}/{hour_str}",
        "filename": jpg_filename,
        "json_filename": json_filename,
        "total": STATS[loc]["count"],
        "minio_uploaded": minio_uploaded,
        "minio_image_path": minio_jpg_path if minio_uploaded else None,
        "minio_json_path": minio_json_path if minio_uploaded else None,
        "postgres_recorded": postgres_recorded,
        "telemetry_recorded": bool(telemetry_dict),
    }

    logger.info(">>> [%s/%s] Response sent: status=%s, interval_ms=%d, deep_sleep_sec=%d", 
                loc, cam_id, response_payload["status"], interval_ms, deep_sleep_sec)

    return jsonify(response_payload), 200

@app.route("/api/latest", methods=["GET"])
def latest():
    loc_param = request.args.get("location") or request.args.get("camera_id") or "front_dept_1"
    loc = resolve_location(loc_param, loc_param)
    
    if request.args.get("image", "false").lower() == "true":
        fp = STATS[loc]["latest_filepath"]
        if fp and os.path.exists(fp):
            resp = send_file(fp, mimetype="image/jpeg")
            resp.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
            resp.headers["Pragma"] = "no-cache"
            resp.headers["Expires"] = "0"
            return resp
            
        # Fallback to MinIO if local disk file not found
        cam_id = LOCATIONS[loc].get("camera_id", loc)
        if minio_client:
            try:
                # Find latest image in MinIO for this camera
                for obj in minio_client.list_objects(MINIO_BUCKET, prefix=f"dataset/{cam_id}/", recursive=True):
                    if obj.object_name.endswith(".jpg"):
                        minio_resp = minio_client.get_object(MINIO_BUCKET, obj.object_name)
                        img_b = minio_resp.read()
                        minio_resp.close()
                        minio_resp.release_conn()
                        r = send_file(io.BytesIO(img_b), mimetype="image/jpeg")
                        r.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
                        return r
            except Exception:
                pass
                
        return jsonify({"error": f"No image available for {loc}"}), 404
        
    return jsonify({
        "stats": STATS[loc],
        "telemetry": LATEST_TELEMETRY.get(loc, {}),
        "minio": {
            "connected": minio_client is not None,
            "endpoint": MINIO_ENDPOINT,
            "bucket": MINIO_BUCKET,
        }
    })

ROI_CONFIG_PATH = BASE_DIR / "data" / "roi.json"
EXTERNAL_ROI_PATH = Path("/home/r211admin/parking-detect/roi.json")

@app.route("/api/roi", methods=["GET", "POST"])
@app.route("/api/roi/<cam_id>", methods=["GET", "POST"])
def manage_roi(cam_id=None):
    """Get or update real-time parking slot polygon ROI coordinates."""
    if request.method == "GET":
        roi_data = {}
        for p in [ROI_CONFIG_PATH, EXTERNAL_ROI_PATH]:
            if p.exists():
                try:
                    with open(p, "r", encoding="utf-8") as rf:
                        roi_data = json.load(rf)
                        break
                except Exception:
                    pass
        if cam_id:
            loc = resolve_location(cam_id, cam_id)
            c_key = LOCATIONS[loc].get("camera_id", cam_id)
            return jsonify({c_key: roi_data.get(c_key, roi_data.get(loc, {}))})
        return jsonify(roi_data)

    elif request.method == "POST":
        payload = request.get_json(silent=True) or {}
        if not payload:
            return jsonify({"error": "Empty ROI payload"}), 400

        roi_data = {}
        if ROI_CONFIG_PATH.exists():
            try:
                with open(ROI_CONFIG_PATH, "r", encoding="utf-8") as rf:
                    roi_data = json.load(rf)
            except Exception:
                roi_data = {}

        if cam_id or "camera_id" in payload:
            target_cam = cam_id or payload.get("camera_id")
            loc = resolve_location(target_cam, target_cam)
            c_key = LOCATIONS[loc].get("camera_id", target_cam)
            roi_data[c_key] = payload
        elif isinstance(payload, dict):
            for k, v in payload.items():
                if k != "_comment":
                    roi_data[k] = v

        roi_data["_updated_at"] = datetime.now().isoformat()
        ROI_CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(ROI_CONFIG_PATH, "w", encoding="utf-8") as rf:
            json.dump(roi_data, rf, indent=2, ensure_ascii=False)

        if EXTERNAL_ROI_PATH.parent.exists():
            try:
                with open(EXTERNAL_ROI_PATH, "w", encoding="utf-8") as rf:
                    json.dump(roi_data, rf, indent=2, ensure_ascii=False)
            except Exception as ex:
                logger.warning("Could not sync to external roi.json: %s", ex)

        logger.info("Saved updated ROI configuration successfully")
        return jsonify({"status": "success", "message": "ROI updated successfully", "data": roi_data})

@app.route("/api/settings", methods=["GET", "POST"])
def settings():
    loc_param = request.args.get("location") or request.args.get("camera_id") or ""
    if loc_param:
        loc = resolve_location(loc_param, loc_param)
        if loc in LOCATIONS:
            if "brightness" in request.args:
                try:
                    b = float(request.args["brightness"])
                    LOCATIONS[loc]["brightness"] = max(0.1, min(2.0, b))
                except ValueError:
                    pass
            if "contrast" in request.args:
                try:
                    c = float(request.args["contrast"])
                    LOCATIONS[loc]["contrast"] = max(0.1, min(3.0, c))
                except ValueError:
                    pass
            if "rotation" in request.args:
                try:
                    LOCATIONS[loc]["rotation"] = int(request.args["rotation"])
                except ValueError:
                    pass

    return jsonify({
        loc_key: {
            "camera_id": LOCATIONS[loc_key].get("camera_id"),
            "name": LOCATIONS[loc_key].get("name"),
            "brightness": LOCATIONS[loc_key].get("brightness", 1.0),
            "contrast": LOCATIONS[loc_key].get("contrast", 1.0),
            "rotation": LOCATIONS[loc_key].get("rotation", 0),
            "interval_sec": LOCATIONS[loc_key].get("interval_sec", 15),
        }
        for loc_key in LOCATIONS
    })

@app.route("/api/image", methods=["GET"])
@app.route("/api/image/<path:img_path>", methods=["GET"])
def get_image(img_path=None):
    """Serve snapshot image from local disk or directly stream from MinIO object storage."""
    target_path = img_path or request.args.get("path") or request.args.get("file") or ""
    if not target_path:
        return jsonify({"error": "Missing image path parameter"}), 400

    # Clean s3:// prefix
    clean_path = target_path.replace(f"s3://{MINIO_BUCKET}/", "").replace("s3://", "").lstrip("/")

    # 1. Try local absolute path
    local_p = Path(target_path)
    if local_p.is_file() and local_p.exists():
        return send_file(str(local_p), mimetype="image/jpeg", max_age=86400)

    # 2. Try relative to BASE_DIR or DATA_DATASET_DIR
    candidates = [
        BASE_DIR / clean_path,
        DATA_DATASET_DIR / clean_path,
        BASE_DIR / "data" / clean_path,
    ]
    for cand in candidates:
        if cand.is_file() and cand.exists():
            return send_file(str(cand), mimetype="image/jpeg", max_age=86400)

    # 3. Stream from MinIO object storage
    if minio_client:
        minio_keys = [
            clean_path,
            f"dataset/{clean_path}" if not clean_path.startswith("dataset/") else clean_path,
            clean_path.replace("data/dataset/", "dataset/"),
        ]
        for mkey in minio_keys:
            try:
                resp = minio_client.get_object(MINIO_BUCKET, mkey)
                img_bytes = resp.read()
                resp.close()
                resp.release_conn()
                return send_file(io.BytesIO(img_bytes), mimetype="image/jpeg", max_age=86400)
            except Exception:
                continue

    return jsonify({"error": f"Image not found for path: {target_path}"}), 404

@app.route("/api/json-sidecar", methods=["GET"])
@app.route("/api/json-sidecar/<path:json_path>", methods=["GET"])
def get_json_sidecar(json_path=None):
    """Serve companion sidecar JSON from local disk or MinIO object storage."""
    target_path = json_path or request.args.get("path") or request.args.get("file") or ""
    if not target_path:
        return jsonify({"error": "Missing json path parameter"}), 400

    clean_path = target_path.replace(f"s3://{MINIO_BUCKET}/", "").replace("s3://", "").lstrip("/")
    # If a .jpg filename was passed, convert to .json
    if clean_path.lower().endswith((".jpg", ".jpeg")):
        clean_path = clean_path.rsplit(".", 1)[0] + ".json"
        clean_path = clean_path.replace("/images/", "/json/")

    # 1. Try local filesystem
    local_p = Path(target_path)
    if local_p.is_file() and local_p.exists():
        try:
            with open(local_p, "r", encoding="utf-8") as jf:
                return jsonify(json.load(jf))
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    candidates = [
        BASE_DIR / clean_path,
        DATA_DATASET_DIR / clean_path,
        BASE_DIR / "data" / clean_path,
    ]
    for cand in candidates:
        if cand.is_file() and cand.exists():
            try:
                with open(cand, "r", encoding="utf-8") as jf:
                    return jsonify(json.load(jf))
            except Exception as e:
                return jsonify({"error": str(e)}), 500

    # 2. Fetch directly from MinIO
    if minio_client:
        minio_keys = [
            clean_path,
            f"dataset/{clean_path}" if not clean_path.startswith("dataset/") else clean_path,
            clean_path.replace("data/dataset/", "dataset/"),
        ]
        for mkey in minio_keys:
            try:
                resp = minio_client.get_object(MINIO_BUCKET, mkey)
                data = json.loads(resp.read().decode("utf-8"))
                resp.close()
                resp.release_conn()
                return jsonify(data)
            except Exception:
                continue

    return jsonify({"error": f"JSON sidecar not found for path: {target_path}"}), 404

@app.route("/api/logs/dates", methods=["GET"])
def get_available_dates():
    """Retrieve distinct capture dates available in PostgreSQL & MinIO."""
    dates_set = set()
    conn = get_pg_connection()
    if conn:
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT DISTINCT (timestamp AT TIME ZONE 'Asia/Bangkok')::date::text
                    FROM camera_telemetry
                    ORDER BY 1 DESC
                    LIMIT 60
                """)
                for r in cur.fetchall():
                    if r[0]:
                        dates_set.add(str(r[0]))
        except Exception as e:
            logger.warning("Error fetching dates from Postgres: %s", e)
        finally:
            conn.close()

    # Fallback to local filesystem dates
    if not dates_set and DATA_DATASET_DIR.exists():
        for d in DATA_DATASET_DIR.glob("*/*"):
            if d.is_dir() and len(d.name) == 10 and d.name.count("-") == 2:
                dates_set.add(d.name)

    dates_list = sorted(list(dates_set), reverse=True)
    return jsonify({"dates": dates_list, "count": len(dates_list)})

@app.route("/api/logs", methods=["GET"])
def get_logs():
    """
    Retrieve real ingestion snapshot and ESP32 telemetry logs from PostgreSQL & MinIO.
    Supports camera filter, date filter, temp filter, pagination, and keyword search.
    """
    limit = min(int(request.args.get("limit", 100)), 1000)
    page = max(int(request.args.get("page", 1)), 1)
    offset = (page - 1) * limit
    cam_filter = (request.args.get("camera_id") or request.args.get("camera") or "all").strip().lower()
    date_filter = (request.args.get("date") or "all").strip()
    temp_filter = (request.args.get("temp_filter") or "all").strip().lower()
    search = (request.args.get("search") or "").strip().lower()
    sort_order = (request.args.get("sort") or "desc").strip().lower()
    source_pref = (request.args.get("source") or "db").strip().lower()

    # Canonical camera mapping
    loc_names = {
        "cam1": "หน้าภาค 1 (รถยนต์)",
        "cam2": "หน้าภาค 2 (รถยนต์)",
        "cam3": "ข้างภาคคอม (มอเตอร์ไซค์)",
        "front_dept_1": "หน้าภาค 1 (รถยนต์)",
        "front_dept_2": "หน้าภาค 2 (รถยนต์)",
        "side_dept": "ข้างภาคคอม (มอเตอร์ไซค์)",
        "front_dept": "หน้าภาค 1 (รถยนต์)",
        "side_dept_1": "ข้างภาคคอม (มอเตอร์ไซค์)",
        "side_dept_2": "ข้างภาคคอม (มอเตอร์ไซค์)",
    }

    records = []
    total_count = 0
    available_dates = []
    avg_temp = 0.0
    high_temp_count = 0
    avg_heap = 157

    conn = get_pg_connection() if source_pref != "minio_only" else None

    if conn:
        try:
            with conn.cursor() as cur:
                # 1. Fetch available dates for UI dropdown
                cur.execute("""
                    SELECT DISTINCT (timestamp AT TIME ZONE 'Asia/Bangkok')::date::text
                    FROM camera_telemetry
                    ORDER BY 1 DESC
                    LIMIT 30
                """)
                available_dates = [r[0] for r in cur.fetchall() if r[0]]

                # 2. Build WHERE clauses
                where_clauses = ["1=1"]
                params = []

                if cam_filter != "all":
                    if cam_filter == "cam1":
                        where_clauses.append("(camera_id = 'cam1' OR location IN ('front_dept_1', 'front_dept'))")
                    elif cam_filter == "cam2":
                        where_clauses.append("(camera_id = 'cam2' OR location = 'front_dept_2')")
                    elif cam_filter in ["cam3", "cam4"]:
                        where_clauses.append("(camera_id IN ('cam3', 'cam4') OR location LIKE 'side%')")
                    else:
                        where_clauses.append("(camera_id = %s OR location = %s)")
                        params.extend([cam_filter, cam_filter])

                if date_filter != "all":
                    where_clauses.append("(timestamp AT TIME ZONE 'Asia/Bangkok')::date = %s::date")
                    params.append(date_filter)

                if temp_filter == "high":
                    where_clauses.append("chip_temp_c >= 80.5")
                elif temp_filter == "normal":
                    where_clauses.append("chip_temp_c < 80.5")

                if search:
                    where_clauses.append("""(
                        image_path ILIKE %s OR
                        minio_url ILIKE %s OR
                        location ILIKE %s OR
                        camera_id ILIKE %s OR
                        raw_metadata::text ILIKE %s
                    )""")
                    s_wild = f"%{search}%"
                    params.extend([s_wild, s_wild, s_wild, s_wild, s_wild])

                where_sql = " AND ".join(where_clauses)

                # 3. Aggregates & Total
                cur.execute(f"""
                    SELECT
                        COUNT(*),
                        COALESCE(AVG(chip_temp_c), 0),
                        COUNT(*) FILTER (WHERE chip_temp_c >= 80.5),
                        COALESCE(AVG(free_heap), 0)
                    FROM camera_telemetry
                    WHERE {where_sql}
                """, tuple(params))
                agg = cur.fetchone()
                if agg:
                    total_count = agg[0]
                    avg_temp = round(float(agg[1]), 1)
                    high_temp_count = agg[2]
                    avg_heap = round(float(agg[3]) / 1024) if agg[3] else 157

                # 4. Fetch Page Items
                order_dir = "ASC" if sort_order == "asc" else "DESC"
                cur.execute(f"""
                    SELECT
                        id,
                        (timestamp AT TIME ZONE 'Asia/Bangkok') as local_ts,
                        location,
                        camera_id,
                        image_path,
                        minio_url,
                        json_path,
                        minio_json_url,
                        light_aec_value,
                        chip_temp_c,
                        wifi_rssi,
                        uptime_sec,
                        free_heap,
                        raw_metadata
                    FROM camera_telemetry
                    WHERE {where_sql}
                    ORDER BY id {order_dir}
                    LIMIT %s OFFSET %s
                """, tuple(params + [limit, offset]))

                for r in cur.fetchall():
                    row_id, local_ts, loc_raw, c_id, img_p, m_url, j_p, m_j_url, aec, temp, rssi, uptime, heap, meta = r
                    raw_meta = meta if isinstance(meta, dict) else {}
                    sidecar_tele = raw_meta.get("telemetry", {})

                    canonical_cam = "cam1"
                    if c_id in ["cam2", "front_dept_2"] or "2" in (loc_raw or ""):
                        canonical_cam = "cam2"
                    elif c_id in ["cam3", "cam4"] or "side" in (loc_raw or ""):
                        canonical_cam = "cam3"

                    loc_display = loc_names.get(loc_raw, loc_names.get(canonical_cam, loc_raw or "ลานจอดรถ"))
                    fn = raw_meta.get("filename")
                    if not fn and img_p:
                        fn = img_p.split("/")[-1]
                    if not fn:
                        fn = f"frame_{row_id}.jpg"

                    minio_obj = (m_url or "").replace(f"s3://{MINIO_BUCKET}/", "")
                    minio_json_obj = (m_j_url or "").replace(f"s3://{MINIO_BUCKET}/", "")
                    if not minio_obj:
                        date_str = local_ts.strftime("%Y-%m-%d") if local_ts else "2026-10-01"
                        hour_str = local_ts.strftime("%H") if local_ts else "00"
                        minio_obj = f"dataset/{canonical_cam}/{date_str}/{hour_str}/images/{fn}"
                        minio_json_obj = f"dataset/{canonical_cam}/{date_str}/{hour_str}/json/{fn.replace('.jpg', '.json')}"

                    local_time_str = local_ts.strftime("%Y-%m-%d %H:%M:%S") if local_ts else "2026-10-01 00:00:00"

                    records.append({
                        "id": row_id,
                        "camera_id": canonical_cam,
                        "location": loc_raw or canonical_cam,
                        "location_name": loc_display,
                        "timestamp": local_ts.isoformat() if local_ts else None,
                        "local_time": local_time_str,
                        "filename": fn,
                        "image_url": f"/api/image?path={minio_obj}",
                        "minio_url": m_url or f"s3://{MINIO_BUCKET}/{minio_obj}",
                        "json_url": f"/api/json-sidecar?path={minio_json_obj}",
                        "minio_json_url": m_j_url or f"s3://{MINIO_BUCKET}/{minio_json_obj}",
                        "client_ip": raw_meta.get("client_ip") or "172.30.91.44",
                        "chip_temp_c": float(temp) if temp is not None else float(sidecar_tele.get("chip_temp_c", 80.0)),
                        "uptime_sec": int(uptime) if uptime is not None else int(sidecar_tele.get("uptime_sec", 0)),
                        "free_heap": int(heap) if heap is not None else int(sidecar_tele.get("free_heap", 157000)),
                        "free_psram": int(sidecar_tele.get("free_psram", 3417932)),
                        "wifi_rssi_dbm": int(rssi) if rssi is not None else int(sidecar_tele.get("wifi_rssi_dbm", -80)),
                        "light_aec_value": aec or sidecar_tele.get("aec_value") or raw_meta.get("light_aec_value"),
                        "status": "ONLINE (HEALTHY)",
                        "file_size_bytes": raw_meta.get("file_size_bytes", 0),
                        "raw_metadata": raw_meta,
                    })

        except Exception as exc:
            logger.error("Error querying logs from PostgreSQL: %s", exc)
        finally:
            conn.close()

    # Fallback: If DB had no records or failed, query MinIO directly
    if not records and minio_client:
        try:
            import itertools
            prefix = "dataset/"
            if cam_filter != "all":
                prefix += f"{cam_filter}/"
                if date_filter != "all":
                    prefix += f"{date_filter}/"

            json_objs = []
            for obj in itertools.islice(minio_client.list_objects(MINIO_BUCKET, prefix=prefix, recursive=True), 500):
                if obj.object_name.endswith(".json"):
                    json_objs.append(obj)

            json_objs.sort(key=lambda x: x.last_modified, reverse=(sort_order == "desc"))
            total_count = len(json_objs)

            for idx, jobj in enumerate(json_objs[offset:offset+limit]):
                try:
                    resp = minio_client.get_object(MINIO_BUCKET, jobj.object_name)
                    data = json.loads(resp.read().decode("utf-8"))
                    resp.close()
                    resp.release_conn()

                    fn = data.get("filename") or jobj.object_name.split("/")[-1].replace(".json", ".jpg")
                    c_id = data.get("camera_id") or "cam1"
                    loc_name = loc_names.get(c_id, data.get("location_name", "ลานจอดรถ"))
                    tele = data.get("telemetry", {})
                    ts = data.get("timestamp")
                    local_time_str = ts.replace("T", " ").split(".")[0] if ts else "2026-10-01 00:00:00"

                    img_obj = jobj.object_name.replace("/json/", "/images/").replace(".json", ".jpg")

                    records.append({
                        "id": idx + 1 + offset,
                        "camera_id": c_id,
                        "location": data.get("location", c_id),
                        "location_name": loc_name,
                        "timestamp": ts,
                        "local_time": local_time_str,
                        "filename": fn,
                        "image_url": f"/api/image?path={img_obj}",
                        "minio_url": f"s3://{MINIO_BUCKET}/{img_obj}",
                        "json_url": f"/api/json-sidecar?path={jobj.object_name}",
                        "minio_json_url": f"s3://{MINIO_BUCKET}/{jobj.object_name}",
                        "client_ip": data.get("client_ip", "172.30.91.44"),
                        "chip_temp_c": float(tele.get("chip_temp_c", 80.0)),
                        "uptime_sec": int(tele.get("uptime_sec", 0)),
                        "free_heap": int(tele.get("free_heap", 157000)),
                        "free_psram": int(tele.get("free_psram", 3417932)),
                        "wifi_rssi_dbm": int(tele.get("wifi_rssi_dbm", -80)),
                        "light_aec_value": tele.get("aec_value"),
                        "status": "ONLINE (HEALTHY)",
                        "file_size_bytes": data.get("file_size_bytes", jobj.size),
                        "raw_metadata": data,
                    })
                except Exception:
                    continue
        except Exception as me:
            logger.error("Error fallback reading from MinIO: %s", me)

    return jsonify({
        "status": "success",
        "total": total_count,
        "page": page,
        "limit": limit,
        "pages": max(1, (total_count + limit - 1) // limit),
        "available_dates": available_dates,
        "stats": {
            "total_records": total_count,
            "avg_temp": avg_temp,
            "high_temp_count": high_temp_count,
            "avg_heap": avg_heap,
            "minio_bucket": MINIO_BUCKET,
            "minio_connected": minio_client is not None,
        },
        "records": records,
    })


GALLERY_HTML = """
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dr. Sum Smart Parking - 3-Camera Live Platform</title>
  <link href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-dark: #090d16;
      --card-bg: #131b2e;
      --border: #1e293b;
      --primary: #38bdf8;
      --accent: #22c55e;
      --text: #f8fafc;
      --text-muted: #94a3b8;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Prompt', sans-serif; }
    body { background-color: var(--bg-dark); color: var(--text); padding: 20px; min-height: 100vh; }
    .header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid var(--border);
    }
    .header h1 { font-size: 1.5rem; font-weight: 700; color: var(--primary); }
    .header .meta { display: flex; gap: 10px; align-items: center; font-size: 0.85rem; flex-wrap: wrap; }
    .badge {
      background: rgba(34, 197, 94, 0.15); color: var(--accent);
      border: 1px solid var(--accent); padding: 4px 10px; border-radius: 9999px;
      font-weight: 500; display: inline-flex; align-items: center; gap: 6px;
    }
    .pulse { width: 8px; height: 8px; background: var(--accent); border-radius: 50%; animation: pulse 1.5s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(1.3); } }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(440px, 1fr)); gap: 20px; }
    .card {
      background: var(--card-bg); border: 1px solid var(--border); border-radius: 14px;
      overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5);
      display: flex; flex-direction: column;
    }
    .card-header {
      padding: 12px 18px; background: rgba(0,0,0,0.25); border-bottom: 1px solid var(--border);
      display: flex; justify-content: space-between; align-items: center;
    }
    .card-title { font-size: 1.05rem; font-weight: 600; display: flex; align-items: center; gap: 8px; }
    .card-stats { font-size: 0.8rem; color: var(--text-muted); }
    .image-box {
      width: 100%; height: 330px; background: #000; display: flex; align-items: center;
      justify-content: center; position: relative; overflow: hidden;
    }
    .image-box img { width: 100%; height: 100%; object-fit: contain; }
    .telemetry-bar {
      padding: 8px 18px; background: #0b1120; border-bottom: 1px solid var(--border);
      font-size: 0.8rem; color: #38bdf8; display: flex; gap: 14px; flex-wrap: wrap;
    }
    .card-footer {
      padding: 12px 18px; font-size: 0.82rem; color: var(--text-muted);
      display: flex; justify-content: space-between; align-items: center;
      background: rgba(0,0,0,0.15); border-top: 1px solid var(--border);
    }
    .btn {
      background: var(--primary); color: #090d16; border: none; padding: 5px 12px;
      border-radius: 6px; font-weight: 600; text-decoration: none; font-size: 0.8rem;
      cursor: pointer; transition: 0.2s;
    }
    .btn:hover { opacity: 0.9; transform: translateY(-1px); }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Dr. Sum Smart Campus Parking — 3-Camera Live Platform</h1>
      <p style="color: var(--text-muted); font-size: 0.85rem; margin-top: 4px;">Time-Partitioned Storage Structure: <code>dataset/&lt;camera&gt;/&lt;date&gt;/&lt;hour&gt;/[images|json]/</code></p>
    </div>
    <div class="meta">
      <div class="badge"><span class="pulse"></span> 3 CAMERAS ONLINE</div>
      <div class="badge" style="border-color: #3b82f6; color: #60a5fa; background: rgba(59, 130, 246, 0.15);">Postgres Active</div>
      <a href="http://172.30.228.51:9001" target="_blank" class="btn" style="background: #e11d48; color: #fff;">MinIO Console</a>
      <a href="/api/telemetry" target="_blank" class="btn" style="background: #8b5cf6; color: #fff;">Telemetry API</a>
      <a href="/status" target="_blank" class="btn">JSON Status</a>
    </div>
  </div>

  <div class="grid">
    <!-- Camera 1: front_dept_1 -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">หน้าภาค 1 (cam1 / front_dept_1)</div>
        <div class="card-stats" id="front1-stats">กำลังโหลด...</div>
      </div>
      <div class="image-box">
        <img id="front1-img" src="/api/latest?location=front_dept_1&image=true" alt="Front 1 Camera">
      </div>
      <div class="telemetry-bar" id="front1-telemetry">
        <span>Telemetry: กำลังอ่านค่า...</span>
      </div>
      <div class="card-footer" style="flex-wrap: wrap; gap: 8px;">
        <span id="front1-meta">Target: รถยนต์ | 10 ช่องจอด</span>
        <div style="display: flex; gap: 6px; align-items: center;">
          <span style="font-size: 0.8rem; color: #cbd5e1;">แสง:</span>
          <button class="btn" onclick="adjustBrightness('front_dept_1', -0.05)" style="padding: 2px 7px;">-</button>
          <span id="front1-bright-label" style="font-size: 0.8rem; font-weight: bold; min-width: 32px; text-align: center;">82%</span>
          <button class="btn" onclick="adjustBrightness('front_dept_1', +0.05)" style="padding: 2px 7px;">+</button>
          <a href="/api/latest?location=front_dept_1&image=true" target="_blank" class="btn">ภาพเต็ม</a>
        </div>
      </div>
    </div>

    <!-- Camera 2: front_dept_2 -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">หน้าภาค 2 (cam2 / front_dept_2)</div>
        <div class="card-stats" id="front2-stats">กำลังโหลด...</div>
      </div>
      <div class="image-box">
        <img id="front2-img" src="/api/latest?location=front_dept_2&image=true" alt="Front 2 Camera">
      </div>
      <div class="telemetry-bar" id="front2-telemetry">
        <span>Telemetry: กำลังอ่านค่า...</span>
      </div>
      <div class="card-footer" style="flex-wrap: wrap; gap: 8px;">
        <span id="front2-meta">Target: รถยนต์ | 10 ช่องจอด</span>
        <div style="display: flex; gap: 6px; align-items: center;">
          <span style="font-size: 0.8rem; color: #cbd5e1;">แสง:</span>
          <button class="btn" onclick="adjustBrightness('front_dept_2', -0.05)" style="padding: 2px 7px;">-</button>
          <span id="front2-bright-label" style="font-size: 0.8rem; font-weight: bold; min-width: 32px; text-align: center;">82%</span>
          <button class="btn" onclick="adjustBrightness('front_dept_2', +0.05)" style="padding: 2px 7px;">+</button>
          <a href="/api/latest?location=front_dept_2&image=true" target="_blank" class="btn">ภาพเต็ม</a>
        </div>
      </div>
    </div>

    <!-- Camera 3: side_dept -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">ข้างภาคคอม (cam3 / side_dept)</div>
        <div class="card-stats" id="side-stats">กำลังโหลด...</div>
      </div>
      <div class="image-box">
        <img id="side-img" src="/api/latest?location=side_dept&image=true" alt="Side Camera">
      </div>
      <div class="telemetry-bar" id="side-telemetry">
        <span>Telemetry: กำลังอ่านค่า...</span>
      </div>
      <div class="card-footer" style="flex-wrap: wrap; gap: 8px;">
        <span id="side-meta">Target: มอเตอร์ไซค์ | 20 ช่องจอด</span>
        <div style="display: flex; gap: 6px; align-items: center;">
          <span style="font-size: 0.8rem; color: #cbd5e1;">แสง:</span>
          <button class="btn" onclick="adjustBrightness('side_dept', -0.05)" style="padding: 2px 7px;">-</button>
          <span id="side-bright-label" style="font-size: 0.8rem; font-weight: bold; min-width: 32px; text-align: center;">80%</span>
          <button class="btn" onclick="adjustBrightness('side_dept', +0.05)" style="padding: 2px 7px;">+</button>
          <a href="/api/latest?location=side_dept&image=true" target="_blank" class="btn">ภาพเต็ม</a>
        </div>
      </div>
    </div>
  </div>

  <script>
    let currentBrightness = { front_dept_1: 0.82, front_dept_2: 0.82, side_dept: 0.80 };

    async function adjustBrightness(loc, delta) {
      currentBrightness[loc] = Math.max(0.2, Math.min(1.8, Math.round((currentBrightness[loc] + delta) * 100) / 100));
      const lblMap = {
        front_dept_1: 'front1-bright-label',
        front_dept_2: 'front2-bright-label',
        side_dept:    'side-bright-label',
      };
      if (lblMap[loc]) {
        document.getElementById(lblMap[loc]).innerText = Math.round(currentBrightness[loc] * 100) + '%';
      }
      await fetch(`/api/settings?location=${loc}&brightness=${currentBrightness[loc]}`);
    }

    function renderTel(elId, t) {
      if (!t || Object.keys(t).length === 0) {
        document.getElementById(elId).innerHTML = `<span>⏳ รอสัญญาณเชื่อมต่อ...</span>`;
        return;
      }
      const tel = t.telemetry || t;
      document.getElementById(elId).innerHTML =
        `<span>Batt: <b>${tel.battery_percent || 'AC'}%</b></span> ` +
        `<span>Temp: <b>${tel.chip_temp_c || tel.temp_c || tel.temperature || '-'}°C</b></span> ` +
        `<span>RSSI: <b>${tel.wifi_rssi_dbm || tel.rssi || '-'} dBm</b></span> ` +
        `<span>AEC: <b>${tel.aec_value || 'auto'}</b></span> ` +
        `<span>Uptime: <b>${tel.uptime_sec ? tel.uptime_sec + 's' : '-'}</b></span>`;
    }

    function renderStats(elId, metaId, s) {
      if (!s) return;
      document.getElementById(elId).innerHTML =
        `สะสม: <b>${s.count}</b> | MinIO: <b>${s.minio_uploaded_count}</b> | PG: <b>${s.postgres_count || 0}</b>`;
      document.getElementById(metaId).innerText =
        `ล่าสุด: ${s.latest_timestamp ? s.latest_timestamp.split('T')[1].substring(0,8) : '-'} (${Math.round(s.latest_size_bytes/1024)} KB) | Part: ${s.latest_partition || '-'}`;
    }

    async function updateFeed() {
      const ts = new Date().getTime();
      document.getElementById('front1-img').src = '/api/latest?location=front_dept_1&image=true&t=' + ts;
      document.getElementById('front2-img').src = '/api/latest?location=front_dept_2&image=true&t=' + ts;
      document.getElementById('side-img').src = '/api/latest?location=side_dept&image=true&t=' + ts;

      try {
        const res = await fetch('/status');
        const data = await res.json();
        const stats = data.stats || {};
        renderStats('front1-stats', 'front1-meta', stats.front_dept_1);
        renderStats('front2-stats', 'front2-meta', stats.front_dept_2);
        renderStats('side-stats', 'side-meta', stats.side_dept);

        const telRes = await fetch('/api/telemetry');
        const telData = await telRes.json();
        renderTel('front1-telemetry', telData.front_dept_1 || telData.cam1);
        renderTel('front2-telemetry', telData.front_dept_2 || telData.cam2);
        renderTel('side-telemetry', telData.side_dept || telData.cam3);
      } catch (e) {
        console.error("Failed to update status", e);
      }
    }

    setInterval(updateFeed, 2000);
    updateFeed();
  </script>
</body>
</html>
"""

@app.route("/gallery", methods=["GET"])
def gallery():
    return render_template_string(GALLERY_HTML)

if __name__ == "__main__":
    host = SERVER_CONFIG.get("host", "0.0.0.0")
    port = SERVER_CONFIG.get("port", 5005)
    print(f"=== 3-CAMERA ENTERPRISE INGESTION SERVER STARTED ON http://{host}:{port} ===")
    app.run(host=host, port=port, debug=False, threaded=True)
