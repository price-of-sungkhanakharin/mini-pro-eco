#!/usr/bin/env python3
"""
dump_dev_data.py – Device Management Frontend Dev-Data Dump
=============================================================
1. Downloads 50 .jpg images from MinIO bucket `raw-datasets`
   that belong to 2026-09-22.
2. Exports 50 matching metadata rows from `camera_telemetry`
   in the `drsum_parking` PostgreSQL database (as both CSV and JSON).
3. Also grabs the companion .json sidecar files from MinIO.
4. Packages everything into a single .zip ready for `scp`.

Usage:
    python3 scripts/dump_dev_data.py          # defaults
    python3 scripts/dump_dev_data.py --date 2026-09-22 --limit 50

Output:
    ~/dev_dump_2026-09-22.zip
      ├── images/              (50 .jpg files)
      ├── json_sidecar/        (50 .json sidecar files from MinIO)
      ├── metadata.csv         (50 rows from camera_telemetry)
      └── metadata.json        (same 50 rows as JSON)
"""

import argparse
import csv
import io
import json
import os
import sys
import zipfile
from datetime import datetime
from pathlib import Path

# ---------------------------------------------------------------------------
# MinIO
# ---------------------------------------------------------------------------
from minio import Minio

MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "localhost:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ROOT_USER", "minioadmin")
MINIO_SECRET_KEY = os.getenv("MINIO_ROOT_PASSWORD", "minioadmin")
MINIO_BUCKET = os.getenv("MINIO_BUCKET_DATASETS", "raw-datasets")

# ---------------------------------------------------------------------------
# PostgreSQL
# ---------------------------------------------------------------------------
import psycopg2
import psycopg2.extras

PG_HOST = os.getenv("POSTGRES_HOST", "localhost")
PG_PORT = int(os.getenv("POSTGRES_PORT", "5432"))
PG_USER = os.getenv("POSTGRES_USER", "postgres")
PG_PASS = os.getenv("POSTGRES_PASSWORD", "postgres")
PG_DB = os.getenv("PG_TELEMETRY_DB", "drsum_parking")


def connect_minio() -> Minio:
    """Return a connected MinIO client."""
    client = Minio(
        MINIO_ENDPOINT,
        access_key=MINIO_ACCESS_KEY,
        secret_key=MINIO_SECRET_KEY,
        secure=False,
    )
    # Smoke-test
    if not client.bucket_exists(MINIO_BUCKET):
        print(f"[ERROR] Bucket '{MINIO_BUCKET}' does not exist.", file=sys.stderr)
        sys.exit(1)
    return client


def list_minio_images(client: Minio, target_date: str, limit: int, target_hour: str | None = None):
    """
    List .jpg objects under any cam*/images/<target_date>/ prefix.
    If target_hour is given (e.g. "18"), restrict to that hour partition.
    Returns a list of object names, capped at `limit`.
    """
    if target_hour:
        # Zero-pad hour to match folder name (e.g. "7" -> "07", "18" -> "18")
        hh = target_hour.zfill(2)
        prefixes_to_try = [
            f"cam1/images/{target_date}/{hh}/",
            f"cam2/images/{target_date}/{hh}/",
            f"cam1/{target_date}/{hh}/",
            f"cam2/{target_date}/{hh}/",
        ]
    else:
        prefixes_to_try = [
            f"cam1/images/{target_date}/",
            f"cam2/images/{target_date}/",
            f"cam1/{target_date}/",
            f"cam2/{target_date}/",
        ]
    jpg_objects: list[str] = []
    for prefix in prefixes_to_try:
        if len(jpg_objects) >= limit:
            break
        try:
            for obj in client.list_objects(MINIO_BUCKET, prefix=prefix, recursive=True):
                if obj.object_name.lower().endswith(".jpg"):
                    jpg_objects.append(obj.object_name)
                    if len(jpg_objects) >= limit:
                        break
        except Exception:
            pass
    return jpg_objects[:limit]


def download_object_bytes(client: Minio, object_name: str) -> bytes | None:
    """Download an object and return its bytes, or None on failure."""
    try:
        resp = client.get_object(MINIO_BUCKET, object_name)
        data = resp.read()
        resp.close()
        resp.release_conn()
        return data
    except Exception as exc:
        print(f"  [WARN] Could not download {object_name}: {exc}")
        return None


def infer_json_sidecar(jpg_object_name: str) -> str | None:
    """
    Given a .jpg path, infer the companion .json sidecar path.

    Layouts seen:
      cam1/images/2026-09-22/07/file.jpg  →  cam1/json/2026-09-22/07/file.json
      cam1/2026-09-21/18/file.jpg         →  cam1/2026-09-21/18/file.json
    """
    base = jpg_object_name.rsplit(".", 1)[0] + ".json"
    if "/images/" in jpg_object_name:
        return base.replace("/images/", "/json/", 1)
    return base


def fetch_metadata_from_pg(target_date: str, minio_urls: list[str], limit: int, target_hour: str | None = None):
    """
    Query camera_telemetry for matching rows.
    Strategy:
      1. Try matching by minio_url IN (...)
      2. Fallback: just grab first `limit` rows for the date (+ optional hour).
    Returns (rows, col_names).
    """
    conn = psycopg2.connect(
        host=PG_HOST, port=PG_PORT, user=PG_USER, password=PG_PASS, dbname=PG_DB
    )
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    if minio_urls:
        cur.execute(
            """
            SELECT id, timestamp, location, camera_id, image_path, minio_url,
                   json_path, minio_json_url,
                   light_aec_value, brightness, contrast, saturation, sharpness,
                   wifi_rssi, chip_temp_c, uptime_sec, free_heap,
                   raw_metadata, created_at
            FROM camera_telemetry
            WHERE minio_url = ANY(%s)
            ORDER BY timestamp
            LIMIT %s
            """,
            (minio_urls, limit),
        )
        rows = cur.fetchall()
        if rows:
            cur.close()
            conn.close()
            return rows

    # Fallback: by date + optional hour
    # The minio_url contains the hour partition, e.g. .../2026-09-22/18/...
    # We filter using the raw_metadata -> 'partition' -> 'hour' field when hour is specified
    if target_hour:
        hh = target_hour.zfill(2)
        cur.execute(
            """
            SELECT id, timestamp, location, camera_id, image_path, minio_url,
                   json_path, minio_json_url,
                   light_aec_value, brightness, contrast, saturation, sharpness,
                   wifi_rssi, chip_temp_c, uptime_sec, free_heap,
                   raw_metadata, created_at
            FROM camera_telemetry
            WHERE timestamp::date = %s
              AND raw_metadata -> 'partition' ->> 'hour' = %s
            ORDER BY timestamp
            LIMIT %s
            """,
            (target_date, hh, limit),
        )
    else:
        cur.execute(
            """
            SELECT id, timestamp, location, camera_id, image_path, minio_url,
                   json_path, minio_json_url,
                   light_aec_value, brightness, contrast, saturation, sharpness,
                   wifi_rssi, chip_temp_c, uptime_sec, free_heap,
                   raw_metadata, created_at
            FROM camera_telemetry
            WHERE timestamp::date = %s
            ORDER BY timestamp
            LIMIT %s
            """,
            (target_date, limit),
        )
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows


def make_serializable(obj):
    """Convert non-serializable types for JSON output."""
    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, bytes):
        return obj.hex()
    return str(obj)


def main():
    parser = argparse.ArgumentParser(description="Dump dev data for Device Management frontend")
    parser.add_argument("--date", default="2026-09-22", help="Target date (YYYY-MM-DD)")
    parser.add_argument("--hour", default=None, help="Filter by hour partition (e.g. 18 for 18:xx)")
    parser.add_argument("--limit", type=int, default=50, help="Number of images/rows")
    parser.add_argument("--output", default=None, help="Output zip path (default: ~/dev_dump_<date>.zip)")
    args = parser.parse_args()

    target_date = args.date
    target_hour = args.hour  # e.g. "18" or None
    limit = args.limit
    if args.output:
        out_zip = args.output
    elif target_hour:
        out_zip = os.path.expanduser(f"~/dev_dump_{target_date}_{target_hour}00.zip")
    else:
        out_zip = os.path.expanduser(f"~/dev_dump_{target_date}.zip")

    print(f"═══════════════════════════════════════════════════════════════")
    print(f"  Dev-Data Dump for Device Management Frontend")
    print(f"  Date:  {target_date}" + (f"  Hour: {target_hour}:00" if target_hour else ""))
    print(f"  Limit: {limit}")
    print(f"  Output: {out_zip}")
    print(f"═══════════════════════════════════════════════════════════════\n")

    # ── Step 1: MinIO – list images ──────────────────────────────────────
    print("[1/4] Connecting to MinIO …")
    mc = connect_minio()

    print(f"[1/4] Listing .jpg objects for {target_date}" + (f" hour {target_hour}:00" if target_hour else "") + f" (limit {limit}) …")
    jpg_list = list_minio_images(mc, target_date, limit, target_hour=target_hour)
    print(f"       Found {len(jpg_list)} images.\n")

    if not jpg_list:
        print("[ERROR] No images found for the target date. Aborting.", file=sys.stderr)
        sys.exit(1)

    # Build minio_url list for PG matching
    minio_urls = [f"s3://{MINIO_BUCKET}/{obj}" for obj in jpg_list]

    # ── Step 2: PostgreSQL – export metadata ─────────────────────────────
    print(f"[2/4] Querying camera_telemetry in {PG_DB} …")
    rows = fetch_metadata_from_pg(target_date, minio_urls, limit, target_hour=target_hour)
    print(f"       Retrieved {len(rows)} rows.\n")

    # ── Step 3: Download images + JSON sidecars from MinIO ───────────────
    print(f"[3/4] Downloading {len(jpg_list)} images + JSON sidecars from MinIO …")
    image_data: dict[str, bytes] = {}
    json_sidecar_data: dict[str, bytes] = {}

    for i, obj_name in enumerate(jpg_list, 1):
        basename = os.path.basename(obj_name)
        progress = f"  [{i:3d}/{len(jpg_list)}]"

        # Download image
        data = download_object_bytes(mc, obj_name)
        if data:
            image_data[basename] = data
            print(f"{progress} [OK] {basename} ({len(data) // 1024} KB)")
        else:
            print(f"{progress} [FAILED] {basename}")

        # Download companion JSON sidecar
        json_obj = infer_json_sidecar(obj_name)
        if json_obj:
            jdata = download_object_bytes(mc, json_obj)
            if jdata:
                json_basename = os.path.basename(json_obj)
                json_sidecar_data[json_basename] = jdata

    print(f"\n       Downloaded {len(image_data)} images, {len(json_sidecar_data)} JSON sidecars.\n")

    # ── Step 4: Build ZIP ────────────────────────────────────────────────
    print(f"[4/4] Building {out_zip} …")
    with zipfile.ZipFile(out_zip, "w", zipfile.ZIP_DEFLATED) as zf:
        # Images
        for fname, data in sorted(image_data.items()):
            zf.writestr(f"images/{fname}", data)

        # JSON sidecars
        for fname, data in sorted(json_sidecar_data.items()):
            zf.writestr(f"json_sidecar/{fname}", data)

        # metadata.json
        rows_serializable = []
        for row in rows:
            clean = {}
            for k, v in row.items():
                clean[k] = make_serializable(v) if not isinstance(v, (str, int, float, bool, type(None), dict, list)) else v
            rows_serializable.append(clean)
        zf.writestr("metadata.json", json.dumps(rows_serializable, indent=2, ensure_ascii=False, default=make_serializable))

        # metadata.csv
        if rows:
            # Flatten: exclude raw_metadata (JSONB) from CSV for readability
            csv_columns = [k for k in rows[0].keys() if k != "raw_metadata"]
            csv_buf = io.StringIO()
            writer = csv.DictWriter(csv_buf, fieldnames=csv_columns, extrasaction="ignore")
            writer.writeheader()
            for row in rows:
                flat = {}
                for k in csv_columns:
                    v = row[k]
                    flat[k] = v.isoformat() if isinstance(v, datetime) else v
                writer.writerow(flat)
            zf.writestr("metadata.csv", csv_buf.getvalue())

    zip_size = os.path.getsize(out_zip)
    print(f"\n═══════════════════════════════════════════════════════════════")
    print(f"  Done!  {out_zip}")
    print(f"     Size:  {zip_size / (1024*1024):.1f} MB")
    print(f"     Images: {len(image_data)} | JSON sidecars: {len(json_sidecar_data)} | DB rows: {len(rows)}")
    print(f"═══════════════════════════════════════════════════════════════")
    print(f"\n  To download to your Mac:")
    print(f"     scp r211admin@<server-ip>:{out_zip} ~/Downloads/")
    print()


if __name__ == "__main__":
    main()
