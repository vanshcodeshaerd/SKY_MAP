"""Compare Skyfield DE421 vs astronomy-engine (optional) for solar-system bodies."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BACKEND = ROOT / "backend"
SKYMAP = ROOT / "skymap-web"

sys.path.insert(0, str(BACKEND))

from app.services.solar_calculator import DE421_TARGET_MAP, calculate_solar_position  # noqa: E402

BODIES = [k for k in DE421_TARGET_MAP if k != "pluto"]

BODY_TO_ENGINE = {
    "sun": "Sun",
    "moon": "Moon",
    "mercury": "Mercury",
    "venus": "Venus",
    "mars": "Mars",
    "jupiter": "Jupiter",
    "saturn": "Saturn",
    "uranus": "Uranus",
    "neptune": "Neptune",
}


def az_error_deg(a: float, b: float) -> float:
    return abs(((a - b) + 540) % 360 - 180)


def client_body_az_alt(body: str, lat: float, lon: float, elev: float, ms: int) -> dict | None:
    eng = BODY_TO_ENGINE.get(body)
    if not eng:
        return None
    script = (
        "import { Horizon, Equator, Body, Observer, MakeTime } from 'astronomy-engine';"
        f"const t=MakeTime(new Date({ms}));"
        f"const obs=new Observer({lat},{lon},{elev});"
        f"const eq=Equator(Body.{eng},t,obs,true,true);"
        f"const hor=Horizon(t,obs,eq.ra,eq.dec,'normal');"
        "console.log(JSON.stringify({az:hor.azimuth,alt:hor.altitude}));"
    )
    r = subprocess.run(
        ["npx", "tsx", "-e", script],
        cwd=SKYMAP,
        capture_output=True,
        text=True,
        shell=True,
        timeout=90,
    )
    if r.returncode != 0:
        return None
    line = r.stdout.strip().splitlines()[-1]
    return json.loads(line)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--lat", type=float, default=34.0522)
    parser.add_argument("--lon", type=float, default=-118.2437)
    parser.add_argument("--elev", type=float, default=0.0)
    parser.add_argument("--skip-client", action="store_true")
    args = parser.parse_args()

    dt = datetime.now(timezone.utc).replace(microsecond=0)
    ms = int(dt.timestamp() * 1000)
    report: dict = {
        "observer": {"lat": args.lat, "lon": args.lon, "elevation_m": args.elev},
        "timestamp_utc": dt.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "backend_de421": {},
        "agreement": {},
    }

    max_az = 0.0
    max_alt = 0.0

    for body in BODIES:
        pos = calculate_solar_position(args.lat, args.lon, args.elev, dt, body=body)
        report["backend_de421"][body] = {
            "azimuth_degrees": pos["azimuth_degrees"],
            "altitude_degrees": pos["altitude_degrees"],
        }
        if args.skip_client:
            continue
        client = client_body_az_alt(body, args.lat, args.lon, args.elev, ms)
        if client is None:
            report["agreement"][body] = {"error": "client_compute_failed"}
            continue
        az_e = az_error_deg(pos["azimuth_degrees"], client["az"])
        alt_e = abs(pos["altitude_degrees"] - client["alt"])
        max_az = max(max_az, az_e)
        max_alt = max(max_alt, alt_e)
        report["agreement"][body] = {
            "azimuth_error_deg": round(az_e, 4),
            "altitude_error_deg": round(alt_e, 4),
        }

    report["summary"] = {
        "max_azimuth_error_deg": round(max_az, 4),
        "max_altitude_error_deg": round(max_alt, 4),
        "pass": args.skip_client
        or (max_az < 0.35 and max_alt < 0.25 and len(report["agreement"]) == len(BODIES)),
    }

    print(json.dumps(report, indent=2))
    if report["summary"]["pass"]:
        print("\nPASS")
        return 0
    print("\nFAIL", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())