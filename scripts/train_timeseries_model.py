#!/usr/bin/env python3
"""
Smart Campus Parking - Thermal-Aware Adaptive Sampling & Deep Sleep Time-Series Trainer
========================================================================================
Architecture:
  - Factors for Optimal Capture Frequency (Application QoS):
      * Weather / Lighting (light_aec_value)
      * Traffic Volatility & Vehicle Arrival/Departure Rate (|ΔVehicles| / Δt)
  - Factors for Hardware Survival (Thermal Reliability):
      * Ambient / Sunlight heating
      * ESP32 CPU / Silicon Temperature (chip_temp_c)
      * Duty Cycle / Active sampling frequency per time window

Models Trained:
  1. Thermal Dynamics Forecaster (Gradient Boosting Regressor):
     Predicts T_cpu(t+1) given current thermal state, ambient light, and sleep duration.
  2. Adaptive Deep-Sleep Policy Optimizer (Decision Tree / Gradient Boosting):
     Recommends optimal sleep duration (10s - 60s) to balance vehicle tracking vs thermal safety.
"""

import os
import sys
import json
import logging
from datetime import datetime, timezone, timedelta
from pathlib import Path

import numpy as np
import pandas as pd
import psycopg2
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.tree import DecisionTreeRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import joblib

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("timeseries_trainer")

BASE_DIR = Path(__file__).resolve().parent.parent
ML_DIR = BASE_DIR / "backend" / "app" / "ml"
ML_DIR.mkdir(parents=True, exist_ok=True)

DB_DSN = os.getenv("DATABASE_URL", "postgresql://parking_user:parkingpass123@localhost:5432/drsum_parking")
BKK_TZ = timezone(timedelta(hours=7))


def load_dataset_from_db():
    logger.info("Connecting to PostgreSQL to load historical telemetry and detections...")
    conn = psycopg2.connect(DB_DSN)

    # 1. Telemetry query (120k+ rows)
    q_tel = """
        SELECT 
            timestamp as ts,
            camera_id as cam,
            chip_temp_c,
            light_aec_value,
            wifi_rssi,
            uptime_sec,
            free_heap
        FROM camera_telemetry
        WHERE chip_temp_c IS NOT NULL 
          AND chip_temp_c >= 20.0 
          AND chip_temp_c <= 90.0
        ORDER BY ts ASC;
    """
    df_tel = pd.read_sql(q_tel, conn)

    # 2. Detections query (27k+ rows)
    q_det = """
        SELECT 
            ts,
            cam,
            cars,
            motorcycles,
            total as total_vehicles,
            capacity,
            occupancy_pct
        FROM detections
        ORDER BY ts ASC;
    """
    df_det = pd.read_sql(q_det, conn)
    conn.close()

    logger.info("Loaded %d telemetry rows and %d detection rows.", len(df_tel), len(df_det))

    df_tel["ts"] = pd.to_datetime(df_tel["ts"])
    df_det["ts"] = pd.to_datetime(df_det["ts"])

    # Merge asof per camera within 60s tolerance
    merged_list = []
    for c in ["cam1", "cam2", "cam3"]:
        t_sub = df_tel[df_tel["cam"] == c].sort_values("ts")
        d_sub = df_det[df_det["cam"] == c].sort_values("ts")
        if not t_sub.empty and not d_sub.empty:
            m = pd.merge_asof(d_sub, t_sub, on="ts", by="cam", direction="nearest", tolerance=pd.Timedelta("60s"))
            merged_list.append(m)

    df = pd.concat(merged_list, ignore_index=True).sort_values("ts").reset_index(drop=True)
    logger.info("Merged aligned dataset: %d rows.", len(df))
    return df


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    logger.info("Engineering domain features for Thermal-Aware Adaptive Sampling...")
    df = df.copy()

    # Time features (Bangkok Time UTC+7)
    ts_bkk = df["ts"].dt.tz_convert("Asia/Bangkok")
    df["hour"] = ts_bkk.dt.hour
    df["minute"] = ts_bkk.dt.minute
    df["day_of_week"] = ts_bkk.dt.dayofweek
    df["is_weekend"] = df["day_of_week"].isin([5, 6]).astype(int)
    df["day_type"] = df["is_weekend"].astype(int)  # 0: Weekday (จ-ศ), 1: Weekend (ส-อา)

    # Campus Domain Feature: Class Transition (:45-:59 or :00-:15 between lectures on weekdays)
    df["is_class_transition"] = (
        (df["day_type"] == 0) &
        (df["hour"] >= 8) & (df["hour"] <= 17) &
        ((df["minute"] >= 45) | (df["minute"] <= 15))
    ).astype(int)

    # Campus Domain Feature: Academic Schedule Phases (0 to 7)
    def compute_campus_phase(row):
        if row["day_type"] == 1:
            return 0  # Weekend idle
        h = row["hour"]
        m = row["minute"]
        t_min = h * 60 + m
        if t_min < 7 * 60:
            return 0  # night_idle (00:00 - 06:59)
        elif t_min < 8 * 60 + 30:
            return 1  # morning_early (07:00 - 08:29) - คนเพิ่งตื่น รถยังน้อย
        elif t_min < 9 * 60 + 30:
            return 2  # morning_rush (08:30 - 09:29) - เร่งด่วนเข้าเรียนคาบเช้า
        elif t_min < 11 * 60 + 30:
            return 3  # morning_lecture (09:30 - 11:29) - คาบเรียนเช้า รถจอดนิ่ง
        elif t_min < 13 * 60:
            return 4  # lunch_flux (11:30 - 12:59) - พักเที่ยง ออกไปกินข้าว เข้า-ออกสูง
        elif t_min < 14 * 60:
            return 5  # afternoon_rush (13:00 - 13:59) - กลับมาเรียนคาบบ่าย
        elif t_min < 16 * 60 + 30:
            return 6  # afternoon_lecture (14:00 - 16:29) - คาบเรียนบ่าย รถจอดนิ่ง
        elif t_min < 19 * 60:
            return 7  # evening_departure (16:30 - 18:59) - เลิกเรียน เลิกงาน ทยอยกลับ
        else:
            return 0  # night_idle (19:00 - 23:59)

    df["campus_phase"] = df.apply(compute_campus_phase, axis=1)
    df["is_lecture_time"] = df["campus_phase"].isin([3, 6]).astype(int)
    df["is_lunch_flux"] = (df["campus_phase"] == 4).astype(int)

    # Rush hours: morning rush, afternoon rush, and evening departure
    df["is_rush_hour"] = df["campus_phase"].isin([2, 5, 7]).astype(int)

    df = df.dropna(subset=["chip_temp_c"]).reset_index(drop=True)
    df["chip_temp_c"] = df["chip_temp_c"].astype(float)
    df["light_aec_value"] = df["light_aec_value"].fillna(1200.0).astype(float)
    df["wifi_rssi"] = df["wifi_rssi"].fillna(-80.0).astype(float)
    df["uptime_sec"] = df["uptime_sec"].fillna(100.0).astype(float)
    df["free_heap"] = df["free_heap"].fillna(157000.0).astype(float)
    df["total_vehicles"] = df["total_vehicles"].fillna(0.0).astype(float)
    df["occupancy_pct"] = df["occupancy_pct"].fillna(0.0).astype(float)

    # Traffic volatility & Rate of change per camera
    df["delta_vehicles"] = 0.0
    df["delta_temp"] = 0.0
    df["target_temp_next"] = df["chip_temp_c"]
    df["optimal_sleep_sec"] = 15.0

    for cam in ["cam1", "cam2", "cam3"]:
        mask = df["cam"] == cam
        sub = df[mask].copy()

        # Delta vehicles (traffic movement / flux)
        diff_v = sub["total_vehicles"].diff().abs().fillna(0.0)
        df.loc[mask, "delta_vehicles"] = diff_v

        # Delta chip temp
        diff_t = sub["chip_temp_c"].diff().fillna(0.0)
        df.loc[mask, "delta_temp"] = diff_t

        # Target future temperature (next observation lead)
        temp_lead = sub["chip_temp_c"].shift(-1).fillna(sub["chip_temp_c"])
        df.loc[mask, "target_temp_next"] = temp_lead

        # Ground truth / Optimal sleep calculation (Multi-Objective Optimization with Campus Dynamics):
        # 1. Hardware Thermal Emergency:
        #    If T_cpu >= 68C -> 60s (Critical cool-down override)
        #    If T_cpu >= 62C -> 45s (Warm warning)
        # 2. Thermal Safe Zone (T_cpu < 58C):
        #    - High vehicle flux (diff_v > 0 or class transition or lunch flux) -> 10s
        #    - Rush hour (morning/afternoon rush) -> 15s
        #    - Lecture in session & cars still (diff_v == 0) -> 30s (rest hardware)
        #    - Weekend idle -> 40s
        #    - Otherwise -> 25s
        # 3. Moderate Temperature (58C <= T_cpu < 62C):
        #    - Keep balanced 30s
        t_curr = sub["chip_temp_c"]
        rush = df.loc[mask, "is_rush_hour"]
        trans = df.loc[mask, "is_class_transition"]
        lunch = df.loc[mask, "is_lunch_flux"]
        lecture = df.loc[mask, "is_lecture_time"]
        wknd = df.loc[mask, "day_type"]

        sleep = np.where(
            t_curr >= 68.0, 60.0,
            np.where(
                t_curr >= 62.0, 45.0,
                np.where(
                    (t_curr < 58.0) & ((diff_v > 0) | (trans == 1) | (lunch == 1)), 10.0,
                    np.where(
                        (t_curr < 60.0) & (rush == 1), 15.0,
                        np.where(
                            (t_curr < 60.0) & (lecture == 1) & (diff_v == 0), 30.0,
                            np.where(
                                wknd == 1, 40.0,
                                np.where(t_curr > 56.0, 25.0, 30.0)
                            )
                        )
                    )
                )
            )
        )
        df.loc[mask, "optimal_sleep_sec"] = sleep

        # Future 15 min and 30 min target alignment for predictive parking availability
        sub_15 = sub[["ts", "total_vehicles"]].copy()
        sub_15["t_15"] = sub_15["ts"] - pd.Timedelta(minutes=15)
        m_15 = pd.merge_asof(
            sub.sort_values("ts"),
            sub_15.sort_values("t_15")[["t_15", "total_vehicles"]].rename(columns={"total_vehicles": "f_15m"}),
            left_on="ts",
            right_on="t_15",
            direction="nearest",
            tolerance=pd.Timedelta(minutes=5)
        )
        df.loc[mask, "target_vehicles_15m"] = m_15["f_15m"].fillna(sub["total_vehicles"]).values

        sub_30 = sub[["ts", "total_vehicles"]].copy()
        sub_30["t_30"] = sub_30["ts"] - pd.Timedelta(minutes=30)
        m_30 = pd.merge_asof(
            sub.sort_values("ts"),
            sub_30.sort_values("t_30")[["t_30", "total_vehicles"]].rename(columns={"total_vehicles": "f_30m"}),
            left_on="ts",
            right_on="t_30",
            direction="nearest",
            tolerance=pd.Timedelta(minutes=8)
        )
        df.loc[mask, "target_vehicles_30m"] = m_30["f_30m"].fillna(sub["total_vehicles"]).values

    # One-hot encode camera
    df["cam_cam1"] = (df["cam"] == "cam1").astype(int)
    df["cam_cam2"] = (df["cam"] == "cam2").astype(int)
    df["cam_cam3"] = (df["cam"] == "cam3").astype(int)

    logger.info("Feature engineering complete. Total valid rows: %d", len(df))
    return df


def train_models(df: pd.DataFrame):
    feature_cols = [
        "chip_temp_c",
        "delta_temp",
        "light_aec_value",
        "wifi_rssi",
        "uptime_sec",
        "total_vehicles",
        "occupancy_pct",
        "delta_vehicles",
        "hour",
        "minute",
        "day_of_week",
        "day_type",
        "is_weekend",
        "is_rush_hour",
        "campus_phase",
        "is_class_transition",
        "is_lecture_time",
        "is_lunch_flux",
        "cam_cam1",
        "cam_cam2",
        "cam_cam3",
    ]

    # Time-based split: First 80% train, last 20% test (Preserve temporal causality)
    split_idx = int(len(df) * 0.8)
    train_df = df.iloc[:split_idx]
    test_df = df.iloc[split_idx:]

    X_train = train_df[feature_cols].fillna(0.0)
    X_test = test_df[feature_cols].fillna(0.0)

    # Target delta temperature: T(t+1) - T(t)
    y_delta_temp_train = train_df["target_temp_next"] - train_df["chip_temp_c"]
    y_delta_temp_test = test_df["target_temp_next"] - test_df["chip_temp_c"]

    y_sleep_train = train_df["optimal_sleep_sec"]
    y_sleep_test = test_df["optimal_sleep_sec"]

    logger.info("Training Split: %d samples (From %s to %s)", 
                len(train_df), train_df["ts"].min().isoformat(), train_df["ts"].max().isoformat())
    logger.info("Testing Split:  %d samples (From %s to %s)", 
                len(test_df), test_df["ts"].min().isoformat(), test_df["ts"].max().isoformat())

    # 1. Train Model A: Thermal Dynamics Forecaster
    logger.info("Fitting Model 1: Thermal Dynamics Forecaster (GradientBoostingRegressor)...")
    thermal_model = GradientBoostingRegressor(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.08,
        random_state=42
    )
    thermal_model.fit(X_train, y_delta_temp_train)

    pred_delta = thermal_model.predict(X_test)
    pred_temp = test_df["chip_temp_c"].values + pred_delta
    mae_temp = mean_absolute_error(test_df["target_temp_next"], pred_temp)
    rmse_temp = np.sqrt(mean_squared_error(test_df["target_temp_next"], pred_temp))
    r2_temp = r2_score(test_df["target_temp_next"], pred_temp)

    logger.info("=== Model 1 (Thermal Forecaster) Evaluation ===")
    logger.info("  MAE:  %.3f °C", mae_temp)
    logger.info("  RMSE: %.3f °C", rmse_temp)
    logger.info("  R²:   %.4f", r2_temp)

    # 2. Train Model B: Adaptive Deep Sleep Policy Optimizer
    logger.info("Fitting Model 2: Adaptive Deep Sleep Policy Optimizer (RandomForestRegressor)...")
    sleep_model = RandomForestRegressor(
        n_estimators=80,
        max_depth=6,
        random_state=42,
        n_jobs=-1
    )
    sleep_model.fit(X_train, y_sleep_train)

    pred_sleep = sleep_model.predict(X_test)
    mae_sleep = mean_absolute_error(y_sleep_test, pred_sleep)
    rmse_sleep = np.sqrt(mean_squared_error(y_sleep_test, pred_sleep))
    r2_sleep = r2_score(y_sleep_test, pred_sleep)

    logger.info("=== Model 2 (Adaptive Deep-Sleep Policy) Evaluation ===")
    logger.info("  MAE:  %.2f seconds", mae_sleep)
    logger.info("  RMSE: %.2f seconds", rmse_sleep)
    logger.info("  R²:   %.4f", r2_sleep)

    # Feature Importance analysis
    feat_imp = sorted(zip(feature_cols, sleep_model.feature_importances_), key=lambda x: x[1], reverse=True)
    logger.info("=== Feature Importances for Sleep Decision ===")
    for fname, imp in feat_imp[:10]:
        logger.info("  - %-20s: %.4f", fname, imp)

    # 3. Train Model C: 15-Minute Future Occupancy Forecaster
    logger.info("Fitting Model 3: 15-Minute Future Occupancy Forecaster (RandomForestRegressor)...")
    y_15m_train = train_df["target_vehicles_15m"].fillna(0.0)
    y_15m_test = test_df["target_vehicles_15m"].fillna(0.0)
    occ_model_15m = RandomForestRegressor(n_estimators=80, max_depth=6, random_state=42, n_jobs=-1)
    occ_model_15m.fit(X_train, y_15m_train)
    pred_15m = occ_model_15m.predict(X_test)
    mae_15m = mean_absolute_error(y_15m_test, pred_15m)
    r2_15m = r2_score(y_15m_test, pred_15m)
    logger.info("=== Model 3 (15-min Occupancy Forecaster) Evaluation ===")
    logger.info("  MAE: %.2f vehicles", mae_15m)
    logger.info("  R²:  %.4f", r2_15m)

    # 4. Train Model D: 30-Minute Future Occupancy Forecaster
    logger.info("Fitting Model 4: 30-Minute Future Occupancy Forecaster (RandomForestRegressor)...")
    y_30m_train = train_df["target_vehicles_30m"].fillna(0.0)
    y_30m_test = test_df["target_vehicles_30m"].fillna(0.0)
    occ_model_30m = RandomForestRegressor(n_estimators=80, max_depth=6, random_state=42, n_jobs=-1)
    occ_model_30m.fit(X_train, y_30m_train)
    pred_30m = occ_model_30m.predict(X_test)
    mae_30m = mean_absolute_error(y_30m_test, pred_30m)
    r2_30m = r2_score(y_30m_test, pred_30m)
    logger.info("=== Model 4 (30-min Occupancy Forecaster) Evaluation ===")
    logger.info("  MAE: %.2f vehicles", mae_30m)
    logger.info("  R²:  %.4f", r2_30m)

    # Save artifacts
    thermal_path = ML_DIR / "thermal_forecaster.joblib"
    sleep_path = ML_DIR / "adaptive_sleep_model.joblib"
    occ_15m_path = ML_DIR / "occupancy_forecaster_15m.joblib"
    occ_30m_path = ML_DIR / "occupancy_forecaster_30m.joblib"
    meta_path = ML_DIR / "timeseries_metadata.json"

    joblib.dump(thermal_model, thermal_path)
    joblib.dump(sleep_model, sleep_path)
    joblib.dump(occ_model_15m, occ_15m_path)
    joblib.dump(occ_model_30m, occ_30m_path)

    metadata = {
        "model_version": "v1.2-campus-forecaster",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "total_dataset_rows": len(df),
        "train_rows": len(train_df),
        "test_rows": len(test_df),
        "feature_cols": feature_cols,
        "campus_phases": {
            "0": "night_idle / weekend_idle",
            "1": "morning_early (07:00-08:30)",
            "2": "morning_rush (08:30-09:30)",
            "3": "morning_lecture (09:30-11:30)",
            "4": "lunch_flux (11:30-13:00)",
            "5": "afternoon_rush (13:00-14:00)",
            "6": "afternoon_lecture (14:00-16:30)",
            "7": "evening_departure (16:30-19:00)"
        },
        "thermal_forecaster_metrics": {
            "mae_celsius": round(float(mae_temp), 3),
            "rmse_celsius": round(float(rmse_temp), 3),
            "r2_score": round(float(r2_temp), 4),
        },
        "sleep_policy_metrics": {
            "mae_seconds": round(float(mae_sleep), 2),
            "rmse_seconds": round(float(rmse_sleep), 2),
            "r2_score": round(float(r2_sleep), 4),
        },
        "occupancy_15m_metrics": {
            "mae_vehicles": round(float(mae_15m), 2),
            "r2_score": round(float(r2_15m), 4),
        },
        "occupancy_30m_metrics": {
            "mae_vehicles": round(float(mae_30m), 2),
            "r2_score": round(float(r2_30m), 4),
        },
        "top_features": [{"feature": f, "importance": round(float(i), 4)} for f, i in feat_imp[:10]],
        "safe_temp_threshold_celsius": 60.0,
        "critical_temp_threshold_celsius": 68.0,
        "min_sleep_sec": 10,
        "max_sleep_sec": 60,
    }

    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2, ensure_ascii=False)

    logger.info("Successfully exported models and metadata to %s", ML_DIR)

    # Sync to MinIO 'timeseries' bucket and 'models/timeseries/' prefix
    try:
        from minio import Minio
        client = Minio(
            "localhost:9000",
            access_key=os.getenv("MINIO_ROOT_USER", "minioadmin"),
            secret_key=os.getenv("MINIO_ROOT_PASSWORD", "minioadmin"),
            secure=False
        )
        if not client.bucket_exists("timeseries"):
            client.make_bucket("timeseries")
        for p in [thermal_path, sleep_path, occ_15m_path, occ_30m_path, meta_path]:
            client.fput_object("timeseries", p.name, str(p))
            if client.bucket_exists("models"):
                client.fput_object("models", f"timeseries/{p.name}", str(p))
        logger.info("Successfully synchronized all Time-Series models to MinIO ('timeseries' bucket and 'models/timeseries/')")
    except Exception as minio_err:
        logger.warning("Could not sync models to MinIO: %s", minio_err)

    return metadata


def main():
    logger.info("Starting End-to-End Time-Series Training Pipeline...")
    df = load_dataset_from_db()
    df_feat = engineer_features(df)
    meta = train_models(df_feat)
    logger.info("Time-Series Training Pipeline finished successfully!")
    print(json.dumps(meta, indent=2))


if __name__ == "__main__":
    main()
