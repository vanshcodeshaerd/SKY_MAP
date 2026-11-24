"""Astronomical Catalog, Constellation, Planet, Observation & Preference Service."""

from __future__ import annotations

import json
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

_ROOT = Path(__file__).resolve().parents[3]
_DATA_DIR = _ROOT / "skymap-web" / "src" / "data"

_CACHE: dict[str, Any] = {}
_OBSERVATIONS: list[dict[str, Any]] = []
_PREFERENCES: dict[str, dict[str, Any]] = {}


def _load_json(name: str) -> Any:
    if name not in _CACHE:
        path = _DATA_DIR / name
        if not path.exists():
            _CACHE[name] = []
        else:
            _CACHE[name] = json.loads(path.read_text(encoding="utf-8"))
    return _CACHE[name]


def get_stars(limit: int = 200, offset: int = 0, q: str | None = None, constellation: str | None = None) -> dict[str, Any]:
    stars = _load_json("stars.advanced.json")
    filtered = stars
    if constellation:
        c_low = constellation.lower()
        filtered = [s for s in filtered if (s.get("constellationId") or "").lower() == c_low]
    if q:
        q_low = q.lower()
        filtered = [
            s for s in filtered
            if q_low in (s.get("name") or "").lower()
            or q_low in (s.get("id") or "").lower()
            or q_low in (s.get("bayer") or "").lower()
        ]
    total = len(filtered)
    return {"total": total, "offset": offset, "limit": limit, "items": filtered[offset : offset + limit]}


def get_star_by_id(star_id: str) -> dict[str, Any] | None:
    stars = _load_json("stars.advanced.json")
    s_low = star_id.lower()
    for s in stars:
        if s["id"].lower() == s_low or str(s.get("hip", "")) == star_id:
            return s
    return None


def get_constellations() -> list[dict[str, Any]]:
    return _load_json("constellations.meta.json")


def get_constellation_by_id(con_id: str) -> dict[str, Any] | None:
    c_low = con_id.lower()
    for c in get_constellations():
        if c["id"].lower() == c_low or c["abbreviation"].lower() == c_low:
            return c
    return None


def get_constellation_stars(con_id: str) -> dict[str, Any]:
    c_low = con_id.lower()
    stars = [s for s in _load_json("stars.advanced.json") if (s.get("constellationId") or "").lower() == c_low]
    lines = [l for l in _load_json("constellations.lines.json") if l["constellationId"].lower() == c_low]
    return {"constellationId": con_id, "stars": stars, "lineSegments": lines}


def _julian_date(dt: datetime) -> float:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        dt = dt.astimezone(timezone.utc)
    return dt.timestamp() / 86400.0 + 2440587.5


def ra_dec_to_alt_az(ra_deg: float, dec_deg: float, lat: float, lon: float, dt: datetime) -> tuple[float, float]:
    jd = _julian_date(dt)
    t = (jd - 2451545.0) / 36525.0
    gmst = (280.46061837 + 360.98564736629 * (jd - 2451545.0) + t * t * (0.000387933 - t / 38710000.0)) % 360.0
    lst = (gmst + lon) % 360.0
    ha = (lst - ra_deg) % 360.0

    lat_r = math.radians(lat)
    dec_r = math.radians(dec_deg)
    ha_r = math.radians(ha)

    sin_alt = math.sin(lat_r) * math.sin(dec_r) + math.cos(lat_r) * math.cos(dec_r) * math.cos(ha_r)
    alt = math.degrees(math.asin(max(-1.0, min(1.0, sin_alt))))
    az = math.degrees(math.atan2(-math.sin(ha_r), math.tan(dec_r) * math.cos(lat_r) - math.sin(lat_r) * math.cos(ha_r))) % 360.0
    return alt, az


def angular_sep_deg(ra1: float, dec1: float, ra2: float, dec2: float) -> float:
    r1, d1 = math.radians(ra1), math.radians(dec1)
    r2, d2 = math.radians(ra2), math.radians(dec2)
    c = math.sin(d1) * math.sin(d2) + math.cos(d1) * math.cos(d2) * math.cos(r1 - r2)
    return math.degrees(math.acos(max(-1.0, min(1.0, c))))


_PLANET_META = [
    {"id": "mercury", "name": "Mercury", "type": "Terrestrial Planet", "a": 0.38709927, "e": 0.20563593, "I": 7.00498, "L": 252.25032, "LDot": 149472.67411, "wBar": 77.45780, "omega": 48.33077},
    {"id": "venus", "name": "Venus", "type": "Terrestrial Planet", "a": 0.72333566, "e": 0.00677672, "I": 3.39468, "L": 181.97910, "LDot": 58517.81539, "wBar": 131.60247, "omega": 76.67984},
    {"id": "mars", "name": "Mars", "type": "Terrestrial Planet", "a": 1.52371034, "e": 0.09339410, "I": 1.84969, "L": -4.55343, "LDot": 19140.30268, "wBar": -23.94363, "omega": 49.55954},
    {"id": "jupiter", "name": "Jupiter", "type": "Gas Giant", "a": 5.20288700, "e": 0.04838624, "I": 1.30440, "L": 34.39644, "LDot": 3034.74613, "wBar": 14.72848, "omega": 100.47391},
    {"id": "saturn", "name": "Saturn", "type": "Gas Giant", "a": 9.53667594, "e": 0.05386179, "I": 2.48599, "L": 49.95424, "LDot": 1222.49362, "wBar": 92.59888, "omega": 113.66242},
]
_EARTH = {"a": 1.00000261, "e": 0.01671123, "I": -0.000015, "L": 100.46457, "LDot": 35999.37245, "wBar": 102.93768, "omega": 0.0}


def _helio_xyz(el: dict[str, Any], t: float) -> tuple[float, float, float]:
    a, e = el["a"], el["e"]
    inc = math.radians(el["I"])
    L = el["L"] + el["LDot"] * t
    w_bar = el["wBar"]
    om = math.radians(el["omega"])
    w = math.radians(w_bar - el["omega"])
    M = (L - w_bar) % 360.0
    if M > 180.0:
        M -= 360.0
    m_rad = math.radians(M)
    E = m_rad + e * math.sin(m_rad)
    for _ in range(6):
        E -= (E - e * math.sin(E) - m_rad) / (1.0 - e * math.cos(E))
    xo = a * (math.cos(E) - e)
    yo = a * math.sqrt(1.0 - e * e) * math.sin(E)
    cw, sw = math.cos(w), math.sin(w)
    co, so = math.cos(om), math.sin(om)
    ci, si = math.cos(inc), math.sin(inc)
    x = (cw * co - sw * so * ci) * xo + (-sw * co - cw * so * ci) * yo
    y = (cw * so + sw * co * ci) * xo + (-sw * so + cw * co * ci) * yo
    z = (sw * si) * xo + (cw * si) * yo
    return x, y, z


def get_planets_positions(lat: float, lon: float, dt: datetime) -> list[dict[str, Any]]:
    t = (_julian_date(dt) - 2451545.0) / 36525.0
    ex, ey, ez = _helio_xyz(_EARTH, t)
    eps = math.radians(23.4392911 - 0.0130042 * t)
    ce, se = math.cos(eps), math.sin(eps)

    out = []
    for p in _PLANET_META:
        px, py, pz = _helio_xyz(p, t)
        xg, yg, zg = px - ex, py - ey, pz - ez
        dist = math.sqrt(xg * xg + yg * yg + zg * zg)
        xeq = xg
        yeq = yg * ce - zg * se
        zeq = yg * se + zg * ce
        ra = math.degrees(math.atan2(yeq, xeq)) % 360.0
        dec = math.degrees(math.atan2(zeq, math.hypot(xeq, yeq)))
        alt, az = ra_dec_to_alt_az(ra, dec, lat, lon, dt)
        out.append({
            "id": p["id"],
            "name": p["name"],
            "type": p["type"],
            "ra": round(ra, 4),
            "dec": round(dec, 4),
            "altitude": round(alt, 2),
            "azimuth": round(az, 2),
            "distanceAU": round(dist, 4),
            "visible": alt > 0,
        })
    return out


def add_observation(obs: dict[str, Any]) -> dict[str, Any]:
    record = {"id": len(_OBSERVATIONS) + 1, **obs, "createdAt": datetime.now(timezone.utc).isoformat()}
    _OBSERVATIONS.append(record)
    return record


def get_preferences(user_id: str) -> dict[str, Any]:
    return _PREFERENCES.get(
        user_id,
        {"user_id": user_id, "display_mode": "BOTH", "magnitude_limit": 5.8, "night_mode": False, "preferred_sky_culture": "IAU"},
    )


def put_preferences(user_id: str, prefs: dict[str, Any]) -> dict[str, Any]:
    updated = {**get_preferences(user_id), **prefs, "user_id": user_id}
    _PREFERENCES[user_id] = updated
    return updated
