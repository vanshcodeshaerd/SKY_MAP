"""Approximate geomagnetic declination (east positive) for compass calibration."""

import math


def magnetic_declination_deg(lat: float, lon: float) -> float:
    """
    IGRF-style dipole approximation (±3–5° typical; not survey-grade).
    Suitable for AR yaw nudge when GPS is known.
    """
    lat_r = math.radians(lat)
    lon_r = math.radians(lon)
    # Colatitude / longitude relative to magnetic north pole (~80.7°N, 72.6°W, WMM2020)
    pole_lat = math.radians(80.7)
    pole_lon = math.radians(-72.6)
    dlon = lon_r - pole_lon
    num = math.sin(dlon) * math.cos(pole_lat)
    den = (
        math.cos(lat_r) * math.sin(pole_lat)
        - math.sin(lat_r) * math.cos(pole_lat) * math.cos(dlon)
    )
    decl = math.degrees(math.atan2(num, den))
    return round(max(-30.0, min(30.0, decl)), 2)