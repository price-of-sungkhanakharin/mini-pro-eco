"""Unit tests for Thermal-Aware Adaptive Deep Sleep and Time-Series Service."""

import pytest
from backend.app.services.timeseries_service import timeseries_service


def test_timeseries_service_loaded():
    """Verify that models and metadata are initialized."""
    assert timeseries_service is not None
    assert timeseries_service.sleep_model is not None
    assert timeseries_service.thermal_model is not None
    assert "feature_cols" in timeseries_service.metadata


def test_critical_overheat_forces_maximum_sleep():
    """When chip temperature exceeds safe thresholds, sleep duration must be maximized."""
    res = timeseries_service.compute_optimal_sleep(
        camera_id="cam1",
        current_telemetry={"chip_temp_c": 75.0, "wifi_rssi_dbm": -70.0, "uptime_sec": 500},
        occupancy_info={"delta_vehicles": 0.0},
    )
    assert res["thermal_status"] == "CRITICAL_OVERHEAT"
    assert res["recommended_sleep_sec"] >= 45
    assert res["interval_ms"] == res["recommended_sleep_sec"] * 1000


def test_rush_hour_high_flux_fast_sampling():
    """When conditions are cool and traffic has high arrival rate, sleep duration should reduce."""
    res = timeseries_service.compute_optimal_sleep(
        camera_id="cam1",
        current_telemetry={"chip_temp_c": 48.0, "wifi_rssi_dbm": -60.0, "uptime_sec": 100},
        occupancy_info={"delta_vehicles": 3.0},
    )
    assert res["thermal_status"] == "NORMAL"
    assert res["recommended_sleep_sec"] <= 20
    assert res["traffic_factor"] == "active_flux"


def test_thermal_prediction_bounds():
    """Verify that temperature prediction output is within physical bounds."""
    res = timeseries_service.compute_optimal_sleep(
        camera_id="cam2",
        current_telemetry={"chip_temp_c": 55.0},
    )
    assert 20.0 <= res["predicted_next_temp_c"] <= 90.0
