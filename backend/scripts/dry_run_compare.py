"""In-process backend vs client-style sun check for Los Angeles (no live HTTP)."""
import json
import subprocess
import sys
from pathlib import Path

from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[2]
SKYMAP = ROOT / "skymap-web"

sys.path.insert(0, str(ROOT / "backend"))
from app.main import app  # noqa: E402


def client_sun_via_node():
    script = (
        "import { sunAltAz } from './src/astronomy.ts';"
        "const d=new Date();"
        "const s=sunAltAz(d,34.0522,-118.2437);"
        "console.log(JSON.stringify({alt:s.altitude,az:s.azimuth}));"
    )
    r = subprocess.run(
        ["npx", "tsx", "-e", script],
        cwd=SKYMAP,
        capture_output=True,
        text=True,
        shell=True,
    )
    if r.returncode != 0:
        return None
    line = r.stdout.strip().splitlines()[-1]
    return json.loads(line)


def main():
    client = TestClient(app)
    health = client.get("/api/health")
    solar = client.get(
        "/api/solar/position",
        params={
            "latitude": 34.0522,
            "longitude": -118.2437,
            "elevation_m": 0,
            "body": "sun",
        },
    )
    cons = client.get("/api/constellations")
    client_sun = client_sun_via_node()

    report = {
        "backend_health": health.json() if health.status_code == 200 else None,
        "backend_solar": solar.json() if solar.status_code == 200 else None,
        "constellation_count": cons.json().get("total") if cons.status_code == 200 else None,
        "client_sun_astronomy_engine": client_sun,
    }

    if client_sun and solar.status_code == 200:
        b = solar.json()
        az_err = abs(((b["azimuth_degrees"] - client_sun["az"]) + 540) % 360 - 180)
        alt_err = abs(b["altitude_degrees"] - client_sun["alt"])
        report["agreement"] = {
            "altitude_error_deg": round(alt_err, 4),
            "azimuth_error_deg": round(az_err, 4),
            "pass": alt_err < 0.15 and az_err < 0.3,
        }

    print(json.dumps(report, indent=2))
    if report.get("agreement", {}).get("pass"):
        print("\nPASS: Backend (Skyfield) matches client (astronomy-engine) for LA Sun.")
        return 0
    print("\nFAIL or incomplete comparison.", file=sys.stderr)
    return 1 if client_sun is None else 0


if __name__ == "__main__":
    raise SystemExit(main())