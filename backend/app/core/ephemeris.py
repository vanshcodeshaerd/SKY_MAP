"""Lazy-load Skyfield timescale and NASA JPL DE421 ephemeris."""

from pathlib import Path
from typing import Any, Optional

from skyfield.api import Loader

# Persist BSP and timescale files next to the backend package (gitignored).
_BACKEND_ROOT = Path(__file__).resolve().parents[2]
_loader = Loader(str(_BACKEND_ROOT))

_timescale: Optional[Any] = None
_ephemeris: Optional[Any] = None
_sun: Optional[Any] = None
_earth: Optional[Any] = None


def get_timescale():
    """Return a cached Skyfield timescale, loading leap-second data on first use."""
    global _timescale
    if _timescale is None:
        _timescale = _loader.timescale()
    return _timescale


def get_ephemeris():
    """Return the cached DE421 kernel (`de421.bsp`), downloading it if needed."""
    global _ephemeris
    if _ephemeris is None:
        _ephemeris = _loader("de421.bsp")
    return _ephemeris


def get_sun_earth():
    """Return `(sun, earth)` bodies from the cached ephemeris."""
    global _sun, _earth
    if _sun is None or _earth is None:
        eph = get_ephemeris()
        _sun = eph["sun"]
        _earth = eph["earth"]
    return _sun, _earth
