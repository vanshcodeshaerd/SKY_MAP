"""Topocentric solar azimuth/altitude, ENU vectors, and solar events."""

from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from skyfield import almanac
from skyfield.api import wgs84

from app.core.config import settings
from app.core.ephemeris import get_ephemeris, get_sun_earth, get_timescale
from app.schemas.solar import format_utc_z

HORIZON_ALTITUDE_DEG = settings.sunrise_altitude_deg


def _ensure_utc(dt_utc: datetime) -> datetime:
    if dt_utc.tzinfo is None:
        return dt_utc.replace(tzinfo=timezone.utc)
    return dt_utc.astimezone(timezone.utc)


def enu_unit_vector(azimuth_deg: float, altitude_deg: float) -> List[float]:
    """East-North-Up unit vector: sx=cos(h)sin(A), sy=cos(h)cos(A), sz=sin(h)."""
    az = np.deg2rad(azimuth_deg)
    alt = np.deg2rad(altitude_deg)
    cos_h = np.cos(alt)
    sx = float(cos_h * np.sin(az))
    sy = float(cos_h * np.cos(az))
    sz = float(np.sin(alt))
    return [sx, sy, sz]


def calculate_solar_position(
    lat: float,
    lon: float,
    elevation_m: float,
    dt_utc: datetime,
    pressure_mbar: float = settings.refraction_pressure_mbar,
    temperature_c: float = settings.refraction_temperature_c,
) -> Dict[str, Any]:
    """Apparent topocentric solar coordinates with Bennett-style refraction."""
    dt_utc = _ensure_utc(dt_utc)
    ts = get_timescale()
    sun, earth = get_sun_earth()
    t = ts.from_datetime(dt_utc)
    observer = earth + wgs84.latlon(
        latitude_degrees=lat,
        longitude_degrees=lon,
        elevation_m=elevation_m,
    )
    apparent = observer.at(t).observe(sun).apparent()

    alt_app, az_app, distance = apparent.altaz(
        pressure_mbar=pressure_mbar,
        temperature_C=temperature_c,
    )
    alt_geo, _, _ = apparent.altaz(pressure_mbar=0.0)

    altitude = float(alt_app.degrees)
    azimuth = float(az_app.degrees)
    refraction = float(alt_app.degrees - alt_geo.degrees)

    return {
        "latitude": lat,
        "longitude": lon,
        "elevation_m": elevation_m,
        "timestamp_utc": format_utc_z(dt_utc),
        "azimuth_degrees": azimuth,
        "altitude_degrees": altitude,
        "is_above_horizon": altitude >= 0.0,
        "atmospheric_refraction_deg": refraction,
        "distance_au": float(distance.au),
    }


def calculate_diurnal_path(
    lat: float,
    lon: float,
    elevation_m: float,
    day: date,
    step_minutes: int = 15,
) -> Dict[str, Any]:
    """Sample a UTC civil day at `step_minutes` and attach sunrise/noon/sunset."""
    waypoints: List[Dict[str, Any]] = []
    midnight = datetime(day.year, day.month, day.day, tzinfo=timezone.utc)
    total_minutes = 24 * 60
    for offset in range(0, total_minutes, step_minutes):
        sample = midnight + timedelta(minutes=offset)
        pos = calculate_solar_position(lat, lon, elevation_m, sample)
        az = pos["azimuth_degrees"]
        alt = pos["altitude_degrees"]
        waypoints.append(
            {
                "time_utc": pos["timestamp_utc"],
                "azimuth_degrees": az,
                "altitude_degrees": alt,
                "vector_enu": enu_unit_vector(az, alt),
                "is_visible": alt >= 0.0,
            }
        )

    events = compute_solar_events(lat, lon, elevation_m, day)
    return {
        "date": day.isoformat(),
        "observer": {"latitude": lat, "longitude": lon},
        "waypoints_count": len(waypoints),
        "waypoints": waypoints,
        "solar_events": events,
    }


def compute_solar_events(
    lat: float,
    lon: float,
    elevation_m: float,
    day: date,
) -> Dict[str, Optional[str]]:
    """Sunrise/sunset at h0=-0.8333° and solar noon (upper meridian transit)."""
    ts = get_timescale()
    eph = get_ephemeris()
    sun, _earth = get_sun_earth()
    t0 = ts.utc(day.year, day.month, day.day)
    t1 = ts.utc(day.year, day.month, day.day + 1)
    topos = wgs84.latlon(
        latitude_degrees=lat,
        longitude_degrees=lon,
        elevation_m=elevation_m,
    )

    sunrise_utc: Optional[str] = None
    sunset_utc: Optional[str] = None
    solar_noon_utc: Optional[str] = None

    rise_set = almanac.sunrise_sunset(eph, topos)
    times, events = almanac.find_discrete(t0, t1, rise_set)
    for t, event in zip(times, events):
        stamp = format_utc_z(t.utc_datetime())
        if int(event) == 1 and sunrise_utc is None:
            sunrise_utc = stamp
        elif int(event) == 0 and sunset_utc is None:
            sunset_utc = stamp

    transits = almanac.meridian_transits(eph, sun, topos)
    mt_times, mt_events = almanac.find_discrete(t0, t1, transits)
    for t, event in zip(mt_times, mt_events):
        # 1 = upper culmination (solar noon)
        if int(event) == 1:
            solar_noon_utc = format_utc_z(t.utc_datetime())
            break

    return {
        "sunrise_utc": sunrise_utc,
        "solar_noon_utc": solar_noon_utc,
        "sunset_utc": sunset_utc,
    }


def nrel_spa_position(
    lat: float,
    lon: float,
    elevation_m: float,
    dt_utc: datetime,
    pressure_mbar: float,
    temperature_c: float,
) -> Tuple[float, float]:
    """Convenience wrapper returning (azimuth, altitude) for reference tests."""
    pos = calculate_solar_position(
        lat,
        lon,
        elevation_m,
        dt_utc,
        pressure_mbar=pressure_mbar,
        temperature_c=temperature_c,
    )
    return pos["azimuth_degrees"], pos["altitude_degrees"]
