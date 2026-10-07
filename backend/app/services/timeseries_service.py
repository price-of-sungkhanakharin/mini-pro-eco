"""
Smart Campus Parking - Thermal-Aware Time-Series Service
=========================================================
Implements the multi-objective optimization service:
  - Balances camera sampling rate (detecting parking occupancy flux)
  - Constrains ESP32 silicon temperature to avoid thermal throttling/crashes
"""

import os
import json
import logging
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import numpy as np

logger = logging.getLogger(__name__)

ML_DIR = Path(__file__).resolve().parent.parent / "ml"
BKK_TZ = timezone(timedelta(hours=7))


class TimeseriesService:
    """Service to predict thermal dynamics and calculate adaptive deep sleep duration."""

    def __init__(self):
        self.sleep_model = None
        self.thermal_model = None
        self.occ_model_15m = None
        self.occ_model_30m = None
        self.metadata = {}
        self._load_models()

    def _load_models(self):
        try:
            import joblib
            sleep_path = ML_DIR / "adaptive_sleep_model.joblib"
            thermal_path = ML_DIR / "thermal_forecaster.joblib"
            occ_15m_path = ML_DIR / "occupancy_forecaster_15m.joblib"
            occ_30m_path = ML_DIR / "occupancy_forecaster_30m.joblib"
            meta_path = ML_DIR / "timeseries_metadata.json"

            # If local files missing, attempt pull from MinIO 'timeseries' bucket
            if not sleep_path.exists() or not thermal_path.exists():
                try:
                    from minio import Minio
                    from backend.app.core.config import settings
                    client = Minio(
                        settings.minio_endpoint,
                        access_key=settings.minio_root_user,
                        secret_key=settings.minio_root_password,
                        secure=False
                    )
                    if client.bucket_exists("timeseries"):
                        for f in ["adaptive_sleep_model.joblib", "thermal_forecaster.joblib", "occupancy_forecaster_15m.joblib", "occupancy_forecaster_30m.joblib", "timeseries_metadata.json"]:
                            client.fget_object("timeseries", f, str(ML_DIR / f))
                except Exception as minio_err:
                    logger.debug("MinIO pull fallback error: %s", minio_err)

            if sleep_path.exists():
                self.sleep_model = joblib.load(sleep_path)
            if thermal_path.exists():
                self.thermal_model = joblib.load(thermal_path)
            if occ_15m_path.exists():
                self.occ_model_15m = joblib.load(occ_15m_path)
            if occ_30m_path.exists():
                self.occ_model_30m = joblib.load(occ_30m_path)
            if meta_path.exists():
                with open(meta_path, "r", encoding="utf-8") as f:
                    self.metadata = json.load(f)
            logger.info("Timeseries models loaded successfully from %s", ML_DIR)
        except Exception as e:
            logger.warning("Could not load timeseries ML models: %s (using heuristic fallback)", e)

    def compute_optimal_sleep(
        self,
        camera_id: str,
        current_telemetry: Optional[Dict[str, Any]] = None,
        occupancy_info: Optional[Dict[str, Any]] = None,
        target_dt: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """
        Evaluate current thermal and traffic environment to recommend optimal deep sleep.
        Returns:
            dict containing recommended_sleep_sec, thermal_status, predicted_temp_c, reason.
        """
        # Time features
        if target_dt:
            if target_dt.tzinfo is None:
                now_bkk = target_dt.replace(tzinfo=BKK_TZ)
            else:
                now_bkk = target_dt.astimezone(BKK_TZ)
        else:
            now_bkk = datetime.now(BKK_TZ)
        hour = now_bkk.hour
        minute = now_bkk.minute
        day_of_week = now_bkk.weekday()
        is_weekend = 1 if day_of_week in (5, 6) else 0
        day_type = is_weekend  # 0: Weekday (จ-ศ), 1: Weekend (ส-อา)

        # Campus Domain Feature: Class Transition (:45-:59 or :00-:15 between lectures)
        is_class_transition = 1 if (day_type == 0 and 8 <= hour <= 17 and (minute >= 45 or minute <= 15)) else 0

        # Campus Domain Feature: Academic Schedule Phases (0 to 7)
        t_min = hour * 60 + minute
        if day_type == 1:
            campus_phase = 0
            phase_name = "weekend_idle (วันหยุด ส-อา)"
        elif t_min < 7 * 60:
            campus_phase = 0
            phase_name = "night_idle (00:00-07:00 รถน้อยมาก)"
        elif t_min < 8 * 60 + 30:
            campus_phase = 1
            phase_name = "morning_early (07:00-08:30 เริ่มทยอยตื่น)"
        elif t_min < 9 * 60 + 30:
            campus_phase = 2
            phase_name = "morning_rush (08:30-09:30 เร่งด่วนเข้าเรียนเช้า)"
        elif t_min < 11 * 60 + 30:
            campus_phase = 3
            phase_name = "morning_lecture (09:30-11:30 ในห้องเรียน รถจอดนิ่ง)"
        elif t_min < 13 * 60:
            campus_phase = 4
            phase_name = "lunch_flux (11:30-13:00 พักเที่ยง ออกไปกินข้าว)"
        elif t_min < 14 * 60:
            campus_phase = 5
            phase_name = "afternoon_rush (13:00-14:00 กลับมาเรียนบ่าย)"
        elif t_min < 16 * 60 + 30:
            campus_phase = 6
            phase_name = "afternoon_lecture (14:00-16:30 ในห้องเรียนบ่าย รถจอดนิ่ง)"
        elif t_min < 19 * 60:
            campus_phase = 7
            phase_name = "evening_departure (16:30-19:00 เลิกเรียน ทยอยกลับ)"
        else:
            campus_phase = 0
            phase_name = "night_idle (19:00-24:00 ค่ำ-ดึก)"

        is_lecture_time = 1 if campus_phase in (3, 6) else 0
        is_lunch_flux = 1 if campus_phase == 4 else 0
        is_rush_hour = 1 if campus_phase in (2, 5, 7) else 0

        # Telemetry extraction
        telemetry = current_telemetry or {}
        curr_temp = float(telemetry.get("chip_temp_c") or telemetry.get("temp_c") or 52.0)
        light_aec = float(telemetry.get("light_aec_value") or telemetry.get("aec") or 1200.0)
        wifi_rssi = float(telemetry.get("wifi_rssi_dbm") or telemetry.get("rssi") or -80.0)
        uptime = float(telemetry.get("uptime_sec") or 100.0)

        # Parking occupancy / traffic flux extraction
        occ = occupancy_info or {}
        total_vehicles = float(occ.get("total_vehicles") or occ.get("occupied_count") or 0.0)
        occ_pct = float(occ.get("occupancy_rate_pct") or occ.get("occupancy_pct") or 0.0)
        delta_v = float(occ.get("delta_vehicles") or (1.0 if (is_rush_hour or is_class_transition or is_lunch_flux) else 0.0))
        delta_temp = float(occ.get("delta_temp") or 0.0)

        # Thermal status classification
        if curr_temp >= 68.0:
            thermal_status = "CRITICAL_OVERHEAT"
            status_desc = "ชิปร้อนวิกฤต (>68°C) บังคับพักระบายความร้อนสูงสุด"
        elif curr_temp >= 62.0:
            thermal_status = "HOT_WARNING"
            status_desc = "ชิปเริ่มร้อนสูง (>62°C) ขยายเวลาหลับเพื่อป้องกันเครื่องแฮงก์"
        elif curr_temp >= 58.0:
            thermal_status = "WARM"
            status_desc = "อุณหภูมิปานกลาง (58-62°C) รักษารอบการทำงานสมดุล"
        else:
            thermal_status = "NORMAL"
            status_desc = "อุณหภูมิปกติ ปลอดภัย (<58°C)"

        # Model Inference if available
        recommended_sleep = 15
        predicted_next_temp = curr_temp

        cols = self.metadata.get("feature_cols", [
            "chip_temp_c", "delta_temp", "light_aec_value", "wifi_rssi", "uptime_sec",
            "total_vehicles", "occupancy_pct", "delta_vehicles", "hour", "minute",
            "day_of_week", "day_type", "is_weekend", "is_rush_hour", "campus_phase",
            "is_class_transition", "is_lecture_time", "is_lunch_flux",
            "cam_cam1", "cam_cam2", "cam_cam3"
        ])
        import pandas as pd
        feature_dict = {
            "chip_temp_c": curr_temp,
            "delta_temp": delta_temp,
            "light_aec_value": light_aec,
            "wifi_rssi": wifi_rssi,
            "uptime_sec": uptime,
            "total_vehicles": total_vehicles,
            "occupancy_pct": occ_pct,
            "delta_vehicles": delta_v,
            "hour": hour,
            "minute": minute,
            "day_of_week": day_of_week,
            "day_type": day_type,
            "is_weekend": is_weekend,
            "is_rush_hour": is_rush_hour,
            "campus_phase": campus_phase,
            "is_class_transition": is_class_transition,
            "is_lecture_time": is_lecture_time,
            "is_lunch_flux": is_lunch_flux,
            "cam_cam1": 1 if camera_id == "cam1" else 0,
            "cam_cam2": 1 if camera_id == "cam2" else 0,
            "cam_cam3": 1 if camera_id == "cam3" else 0,
        }
        # Keep only columns expected by model
        row_vals = [feature_dict.get(c, 0.0) for c in cols]
        feature_df = pd.DataFrame([row_vals], columns=cols)

        if self.sleep_model is not None:
            try:
                pred_s = float(self.sleep_model.predict(feature_df)[0])
                recommended_sleep = int(round(np.clip(pred_s, 10, 60)))
            except Exception as me:
                logger.debug("Sleep model prediction error: %s", me)
        else:
            # Physics-based Fallback Controller
            if curr_temp >= 68.0:
                recommended_sleep = 60
            elif curr_temp >= 62.0:
                recommended_sleep = 45
            elif (delta_v > 0 or is_rush_hour == 1) and curr_temp < 58.0:
                recommended_sleep = 10 if delta_v > 0 else 15
            elif curr_temp > 56.0:
                recommended_sleep = 25
            else:
                recommended_sleep = 30

        if self.thermal_model is not None:
            try:
                pred_delta = float(self.thermal_model.predict(feature_df)[0])
                predicted_next_temp = round(curr_temp + pred_delta, 1)
            except Exception as te:
                logger.debug("Thermal model prediction error: %s", te)

        # Hardware Safety hard override
        if curr_temp >= 68.0 and recommended_sleep < 45:
            recommended_sleep = 60

        return {
            "camera_id": camera_id,
            "recommended_sleep_sec": recommended_sleep,
            "interval_ms": recommended_sleep * 1000,
            "current_temp_c": round(curr_temp, 1),
            "predicted_next_temp_c": predicted_next_temp,
            "thermal_status": thermal_status,
            "traffic_factor": "active_flux" if (delta_v > 0 or is_rush_hour or is_class_transition) else "steady",
            "is_rush_hour": bool(is_rush_hour),
            "campus_phase": campus_phase,
            "campus_phase_name": phase_name,
            "is_class_transition": bool(is_class_transition),
            "day_type": "weekend" if day_type == 1 else "weekday",
            "reason": f"{status_desc} [{phase_name}] | แนะนำ Deep-Sleep {recommended_sleep} วินาที",
            "model_version": self.metadata.get("model_version", "heuristic_v1"),
            "evaluated_at": now_bkk.isoformat(),
        }

    def predict_future_occupancy(
        self,
        camera_id: str = "cam1",
        horizon_minutes: int = 15,
        current_vehicles: Optional[int] = None,
        capacity: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Predict future parking occupancy (15-min or 30-min lead) based on academic campus schedule.
        """
        now_bkk = datetime.now(BKK_TZ)
        hour = now_bkk.hour
        minute = now_bkk.minute
        day_of_week = now_bkk.weekday()
        is_weekend = 1 if day_of_week in (5, 6) else 0
        day_type = is_weekend

        is_class_transition = 1 if (day_type == 0 and 8 <= hour <= 17 and (minute >= 45 or minute <= 15)) else 0
        t_min = hour * 60 + minute
        if day_type == 1:
            campus_phase = 0
            phase_name = "weekend_idle (วันหยุด ส-อา)"
            trend_desc = "วันหยุด ส-อา รถเบาบางตลอดวัน มีที่จอดว่างเหลือเฟือ"
        elif t_min < 7 * 60:
            campus_phase = 0
            phase_name = "night_idle (00:00-07:00 รถน้อยมาก)"
            trend_desc = "ช่วงดึกถึงเช้าตรู่ ลานจอดว่างโล่ง"
        elif t_min < 8 * 60 + 30:
            campus_phase = 1
            phase_name = "morning_early (07:00-08:30 เริ่มทยอยตื่น)"
            trend_desc = "คนเริ่มทยอยเดินทางมามหาวิทยาลัย ที่จอดเริ่มมีรถเข้า"
        elif t_min < 9 * 60 + 30:
            campus_phase = 2
            phase_name = "morning_rush (08:30-09:30 เร่งด่วนเข้าเรียนเช้า)"
            trend_desc = "ช่วงเร่งด่วนเข้าเรียนคาบเช้า รถจะเข้าแน่นและเต็มเร็วมาก"
        elif t_min < 11 * 60 + 30:
            campus_phase = 3
            phase_name = "morning_lecture (09:30-11:30 ในห้องเรียน รถจอดนิ่ง)"
            trend_desc = "นักศึกษาอยู่ในห้องเรียน รถจอดนิ่ง ไม่ค่อยมีการขยับ"
        elif t_min < 13 * 60:
            campus_phase = 4
            phase_name = "lunch_flux (11:30-13:00 พักเที่ยง ออกไปกินข้าว)"
            trend_desc = "ช่วงพักเที่ยง รถจะขับออกไปกินข้าวและเริ่มกลับเข้ามา คาดว่าจะเริ่มมีที่ว่างหมุนเวียน"
        elif t_min < 14 * 60:
            campus_phase = 5
            phase_name = "afternoon_rush (13:00-14:00 กลับมาเรียนบ่าย)"
            trend_desc = "ช่วงกลับมาเข้าเรียนคาบบ่าย ที่จอดจะถูกเติมเต็มอย่างรวดเร็ว"
        elif t_min < 16 * 60 + 30:
            campus_phase = 6
            phase_name = "afternoon_lecture (14:00-16:30 ในห้องเรียนบ่าย รถจอดนิ่ง)"
            trend_desc = "อยู่ในห้องเรียนคาบบ่าย การเข้า-ออกนิ่งสนิท"
        elif t_min < 19 * 60:
            campus_phase = 7
            phase_name = "evening_departure (16:30-19:00 เลิกเรียน ทยอยกลับ)"
            trend_desc = "ช่วงเลิกเรียนและเลิกงาน รถกำลังทยอยขับออก ที่จอดจะว่างเพิ่มขึ้นต่อเนื่อง"
        else:
            campus_phase = 0
            phase_name = "night_idle (19:00-24:00 ค่ำ-ดึก)"
            trend_desc = "ช่วงค่ำ-ดึก ลานจอดว่างยาว"

        is_lecture_time = 1 if campus_phase in (3, 6) else 0
        is_lunch_flux = 1 if campus_phase == 4 else 0
        is_rush_hour = 1 if campus_phase in (2, 5, 7) else 0

        # Default camera capacities
        cap = capacity or (20 if "cam3" in camera_id else 10)
        curr_v = float(current_vehicles if current_vehicles is not None else 0.0)

        # Select model (15m vs 30m)
        model = self.occ_model_15m if horizon_minutes <= 15 else self.occ_model_30m
        model_name = "occupancy_forecaster_15m" if horizon_minutes <= 15 else "occupancy_forecaster_30m"

        predicted_v = curr_v
        if model is not None:
            try:
                import pandas as pd
                cols = self.metadata.get("feature_cols", [])
                feature_dict = {
                    "chip_temp_c": 52.0,
                    "delta_temp": 0.0,
                    "light_aec_value": 1200.0,
                    "wifi_rssi": -70.0,
                    "uptime_sec": 1000.0,
                    "total_vehicles": curr_v,
                    "occupancy_pct": round((curr_v / cap) * 100, 1),
                    "delta_vehicles": 0.0,
                    "hour": hour,
                    "minute": minute,
                    "day_of_week": day_of_week,
                    "day_type": day_type,
                    "is_weekend": is_weekend,
                    "is_rush_hour": is_rush_hour,
                    "campus_phase": campus_phase,
                    "is_class_transition": is_class_transition,
                    "is_lecture_time": is_lecture_time,
                    "is_lunch_flux": is_lunch_flux,
                    "cam_cam1": 1 if camera_id == "cam1" else 0,
                    "cam_cam2": 1 if camera_id == "cam2" else 0,
                    "cam_cam3": 1 if camera_id == "cam3" else 0,
                }
                row_vals = [feature_dict.get(c, 0.0) for c in cols]
                feature_df = pd.DataFrame([row_vals], columns=cols)
                raw_pred = float(model.predict(feature_df)[0])
                predicted_v = round(max(0.0, min(float(cap), raw_pred)), 1)
            except Exception as pe:
                logger.debug("Future occupancy prediction error: %s", pe)

        predicted_free = max(0, int(round(cap - predicted_v)))
        predicted_occ_pct = round((predicted_v / cap) * 100, 1)

        if predicted_free >= 4:
            chance = "HIGH_CHANCE"
            chance_desc = "มีโอกาสสูงที่จะมีที่จอดว่าง (ว่างสะดวก)"
        elif predicted_free >= 1:
            chance = "MODERATE"
            chance_desc = "มีที่จอดว่างปานกลาง (อาจต้องรีบมาจอด)"
        else:
            chance = "FULL_RISK"
            chance_desc = "เสี่ยงที่จอดเต็ม แนะนำหาที่จอดสำรอง"

        target_time = (now_bkk + timedelta(minutes=horizon_minutes)).strftime("%H:%M")

        return {
            "camera_id": camera_id,
            "horizon_minutes": horizon_minutes,
            "target_time": target_time,
            "capacity": cap,
            "current_vehicles": int(curr_v),
            "predicted_vehicles": predicted_v,
            "predicted_free_slots": predicted_free,
            "predicted_occupancy_pct": predicted_occ_pct,
            "availability_chance": chance,
            "availability_desc": chance_desc,
            "campus_phase": campus_phase,
            "campus_phase_name": phase_name,
            "campus_trend_desc": trend_desc,
            "is_class_transition": bool(is_class_transition),
            "model_used": model_name,
            "evaluated_at": now_bkk.isoformat(),
        }


timeseries_service = TimeseriesService()
