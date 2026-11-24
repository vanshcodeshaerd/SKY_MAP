"""Tests for Astronomical Catalog, Constellation, Planet, Sky & Preferences API."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services import sky_catalog as svc


def test_constellations_count():
    cons = svc.get_constellations()
    assert len(cons) == 88


def test_star_lookup_and_search():
    res = svc.get_stars(limit=10, q="Sirius")
    assert res["total"] >= 1
    assert any(s["name"] == "Sirius" for s in res["items"])


def test_planets_ephemeris():
    from datetime import datetime, timezone
    items = svc.get_planets_positions(23.0225, 72.5714, datetime(2026, 1, 15, 20, 0, tzinfo=timezone.utc))
    assert len(items) == 5
    names = {p["name"] for p in items}
    assert names == {"Mercury", "Venus", "Mars", "Jupiter", "Saturn"}
    for p in items:
        assert 0.0 <= p["ra"] < 360.0
        assert -35.0 <= p["dec"] <= 35.0
        assert 0.0 <= p["azimuth"] < 360.0


def test_preferences_and_observations():
    prefs = svc.put_preferences("test_user", {"display_mode": "PLANETS", "night_mode": True})
    assert prefs["display_mode"] == "PLANETS"
    assert prefs["night_mode"] is True

    obs = svc.add_observation({"user_id": "test_user", "celestial_object_id": "ORI", "latitude": 23.0, "longitude": 72.5})
    assert obs["celestial_object_id"] == "ORI"
