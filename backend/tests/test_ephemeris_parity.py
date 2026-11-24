"""DE421 ephemeris sanity and batch consistency (no Node required)."""

from datetime import datetime, timezone

import pytest

from app.services.solar_calculator import (
    DE421_TARGET_MAP,
    calculate_solar_position,
    calculate_solar_positions_batch,
    enu_unit_vector,
)

BODIES = [k for k in DE421_TARGET_MAP if k != "pluto"]


@pytest.fixture
def observer_dt():
    return datetime(2026, 6, 21, 12, 0, tzinfo=timezone.utc)


@pytest.mark.parametrize("body", BODIES)
def test_each_body_valid_horizontal(body, observer_dt):
    pos = calculate_solar_position(28.6139, 77.2090, 200.0, observer_dt, body=body)
    assert 0.0 <= pos["azimuth_degrees"] <= 360.0
    assert -90.0 <= pos["altitude_degrees"] <= 90.0
    vec = enu_unit_vector(pos["azimuth_degrees"], pos["altitude_degrees"])
    assert sum(v * v for v in vec) == pytest.approx(1.0, abs=1e-5)


def test_batch_matches_single_positions(observer_dt):
    batch = calculate_solar_positions_batch(
        28.6139, 77.2090, 200.0, observer_dt, bodies=BODIES
    )
    assert set(batch.keys()) == set(BODIES)
    for body in BODIES:
        single = calculate_solar_position(28.6139, 77.2090, 200.0, observer_dt, body=body)
        b = batch[body]
        assert b["azimuth_degrees"] == pytest.approx(single["azimuth_degrees"], abs=1e-6)
        assert b["altitude_degrees"] == pytest.approx(single["altitude_degrees"], abs=1e-6)


def test_sun_moon_angular_separation_sane(observer_dt):
    sun = calculate_solar_position(28.6139, 77.2090, 0, observer_dt, body="sun")
    moon = calculate_solar_position(28.6139, 77.2090, 0, observer_dt, body="moon")
  # Sun and Moon are distinct directions
    az_diff = abs(((sun["azimuth_degrees"] - moon["azimuth_degrees"]) + 540) % 360 - 180)
    assert az_diff > 0.1 or abs(sun["altitude_degrees"] - moon["altitude_degrees"]) > 0.1