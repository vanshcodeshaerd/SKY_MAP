"""Unit tests for astronomical coordinate calculations and vector conversions."""

from datetime import datetime, timezone
import numpy as np
import pytest

from app.services.solar_calculator import (
    calculate_solar_position,
    calculate_diurnal_path,
    enu_unit_vector,
)


def test_enu_unit_vector_norm():
    """Verify that ENU unit vectors maintain norm == 1.0 across all angles."""
    test_cases = [
        (0.0, 0.0),      # North horizon
        (90.0, 0.0),     # East horizon
        (180.0, 0.0),    # South horizon
        (270.0, 0.0),    # West horizon
        (45.0, 45.0),    # Intermediate
        (120.0, 89.0),   # Near zenith
        (300.0, -45.0),  # Below horizon
    ]
    for az, alt in test_cases:
        vec = enu_unit_vector(az, alt)
        norm = np.linalg.norm(vec)
        assert pytest.approx(norm, abs=1e-6) == 1.0


def test_enu_vector_direction():
    """Verify cardinal direction vectors in ENU."""
    # North (A=0, h=0) -> [0, 1, 0]
    vn = enu_unit_vector(0.0, 0.0)
    assert pytest.approx(vn[0], abs=1e-5) == 0.0
    assert pytest.approx(vn[1], abs=1e-5) == 1.0
    assert pytest.approx(vn[2], abs=1e-5) == 0.0

    # East (A=90, h=0) -> [1, 0, 0]
    ve = enu_unit_vector(90.0, 0.0)
    assert pytest.approx(ve[0], abs=1e-5) == 1.0
    assert pytest.approx(ve[1], abs=1e-5) == 0.0
    assert pytest.approx(ve[2], abs=1e-5) == 0.0

    # Zenith (A=*, h=90) -> [0, 0, 1]
    vz = enu_unit_vector(0.0, 90.0)
    assert pytest.approx(vz[0], abs=1e-5) == 0.0
    assert pytest.approx(vz[1], abs=1e-5) == 0.0
    assert pytest.approx(vz[2], abs=1e-5) == 1.0


def test_solar_position_delhi():
    """Verify solar calculation for New Delhi, India."""
    dt = datetime(2026, 6, 21, 6, 30, tzinfo=timezone.utc)  # Summer solstice near noon local
    pos = calculate_solar_position(
        lat=28.6139,
        lon=77.2090,
        elevation_m=216.0,
        dt_utc=dt,
    )
    assert 0.0 <= pos["azimuth_degrees"] <= 360.0
    # Summer solstice midday in Delhi: Sun is very high
    assert pos["altitude_degrees"] > 60.0
    assert pos["is_above_horizon"] is True
    assert 0.98 <= pos["distance_au"] <= 1.02


def test_diurnal_path_waypoints():
    """Verify 24-hour diurnal path creates 96 waypoints at 15-minute intervals."""
    from datetime import date
    res = calculate_diurnal_path(
        lat=28.6139,
        lon=77.2090,
        elevation_m=216.0,
        day=date(2026, 6, 21),
        step_minutes=15,
    )
    assert res["waypoints_count"] == 96
    assert len(res["waypoints"]) == 96
    assert res["solar_events"]["sunrise_utc"] is not None
    assert res["solar_events"]["sunset_utc"] is not None
    assert res["solar_events"]["solar_noon_utc"] is not None
