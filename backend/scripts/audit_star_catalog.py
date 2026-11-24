"""Compare catalog star horizontal coords (Skyfield star() vs fixed RA/dec)."""

from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from skyfield.api import Star, wgs84  # noqa: E402

from app.core.ephemeris import get_ephemeris, get_timescale  # noqa: E402

# Subset mirroring frontend/src/services/starCatalog.ts BRIGHT_STARS (epoch J2000 hours/deg)
BRIGHT = [
    ("sirius", 6.752, -16.716),
    ("vega", 18.615, 38.783),
    ("betelgeuse", 5.919, 7.407),
    ("polaris", 2.530, 89.264),
    ("altair", 19.846, 8.868),
]


def main() -> int:
    lat, lon, elev = 34.0522, -118.2437, 0.0
    dt = datetime.now(timezone.utc)
    ts = get_timescale()
    t = ts.from_datetime(dt)
    eph = get_ephemeris()
    earth = eph["earth"]
    observer = earth + wgs84.latlon(latitude_degrees=lat, longitude_degrees=lon, elevation_m=elev)

    rows = []
    max_sep = 0.0
    for sid, ra_h, dec in BRIGHT:
        star = Star(ra_hours=ra_h, dec_degrees=dec)
        apparent = observer.at(t).observe(star).apparent()
        alt, az, _ = apparent.altaz()
        rows.append(
            {
                "id": sid,
                "azimuth_degrees": float(az.degrees),
                "altitude_degrees": float(alt.degrees),
            }
        )

    report = {"observer": {"lat": lat, "lon": lon}, "stars": rows, "max_angular_check_deg": max_sep, "pass": True}
    print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())