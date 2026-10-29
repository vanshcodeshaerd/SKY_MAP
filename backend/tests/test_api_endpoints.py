"""Integration tests for FastAPI endpoints."""

from fastapi.testclient import TestClient
import pytest

from app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "version" in data
    assert "timestamp_utc" in data
    assert "Skyfield" in data["ephemeris_engine"]


def test_solar_position_valid():
    response = client.get(
        "/api/solar/position",
        params={
            "latitude": 28.6139,
            "longitude": 77.2090,
            "elevation_m": 216.0,
            "timestamp": "2026-06-21T06:30:00Z",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "azimuth_degrees" in data
    assert "altitude_degrees" in data
    assert "is_above_horizon" in data
    assert 0.0 <= data["azimuth_degrees"] <= 360.0


def test_solar_position_invalid_lat():
    response = client.get(
        "/api/solar/position",
        params={"latitude": 95.0, "longitude": 77.0},
    )
    assert response.status_code == 422


def test_solar_path_valid():
    response = client.get(
        "/api/solar/path",
        params={
            "latitude": 28.6139,
            "longitude": 77.2090,
            "date": "2026-06-21",
            "step_minutes": 30,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["waypoints_count"] == 48
    assert len(data["waypoints"]) == 48
    assert "solar_events" in data
