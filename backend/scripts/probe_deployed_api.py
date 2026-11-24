"""Probe a deployed SkyGazer API base URL (health, solar sample, CORS hints)."""

from __future__ import annotations

import argparse
import json
import sys

import httpx


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--base",
        required=True,
        help="API origin without trailing slash, e.g. https://skygazer-apii.onrender.com",
    )
    parser.add_argument(
        "--origin",
        default="https://sky-map-ar.vercel.app",
        help="Origin header to simulate browser CORS preflight",
    )
    parser.add_argument("--timeout", type=float, default=25.0)
    args = parser.parse_args()

    base = args.base.rstrip("/")
    report: dict = {"base": base, "checks": {}}

    with httpx.Client(timeout=args.timeout, follow_redirects=True) as client:
        for name, method, path, params in [
            ("health", "GET", "/api/health", None),
            (
                "solar_sun",
                "GET",
                "/api/solar/position",
                {"latitude": 34.05, "longitude": -118.24, "elevation_m": 0, "body": "sun"},
            ),
        ]:
            url = f"{base}{path}"
            headers = {"Origin": args.origin}
            r = client.request(method, url, params=params, headers=headers)
            cors_allow = r.headers.get("access-control-allow-origin", "")
            report["checks"][name] = {
                "status_code": r.status_code,
                "access_control_allow_origin": cors_allow or None,
                "cors_ok_for_origin": cors_allow in ("*", args.origin) or args.origin in cors_allow,
            }
            if r.status_code == 200:
                try:
                    report["checks"][name]["json"] = r.json()
                except Exception:
                    report["checks"][name]["body_preview"] = r.text[:200]

    health_ok = report["checks"].get("health", {}).get("status_code") == 200
    cors_ok = report["checks"].get("health", {}).get("cors_ok_for_origin", False)
    report["summary"] = {
        "reachable": health_ok,
        "cors_allows_simulated_origin": cors_ok,
        "hint": None
        if cors_ok
        else "Set CORS_ORIGINS or CORS_ORIGIN_REGEX on Render, or use Vercel /api proxy.",
    }

    print(json.dumps(report, indent=2))
    return 0 if health_ok else 1


if __name__ == "__main__":
    raise SystemExit(main())