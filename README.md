# SkyMap AR / SkyGazer AR

**Browser AR for the night sky** — planets, bright stars, constellation lines, connect-the-dots **Play**, 3D explorer, and optional **NASA JPL DE421** verification from a Python API.

[![Live App](https://img.shields.io/badge/Live_App-sky--map--ar.vercel.app-000?style=for-the-badge&logo=vercel)](https://sky-map-ar.vercel.app)
[![API Health](https://img.shields.io/badge/API-Render_FastAPI-46E3B1?style=for-the-badge&logo=render)](https://skygazer-apii.onrender.com/api/health)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![Ephemeris](https://img.shields.io/badge/Ephemeris-DE421_Skyfield-0B3D91)](https://rhodesmill.org/skyfield/)

| | |
|---|---|
| **Live web app** | [https://sky-map-ar.vercel.app](https://sky-map-ar.vercel.app) |
| **Repository** | [github.com/vanshcodeshaerd/SKY_MAP](https://github.com/vanshcodeshaerd/SKY_MAP) |
| **Backend health** | [https://sky-map-ar.vercel.app/api/health](https://sky-map-ar.vercel.app/api/health) (proxied to Render) |
| **Constellation Play** | [https://sky-map-ar.vercel.app/constellations/](https://sky-map-ar.vercel.app/constellations/) or **AR → Play** in the main app |

*University-level **Computer Graphics & Image Processing (CGIP)** project: coordinate transforms, WebGL, sensor fusion, ephemeris math, and OpenCV experiments.*

---

## Highlights

| Area | What you get |
|------|----------------|
| **AR Sky View** | Live camera + overlay for **Sun, Moon, and planets**; **stars + IAU-style lines**; BOTH / PLANETS / CONSTELLATIONS filters |
| **One AR tab** | **Play** (full constellation quest) opens inside AR — not a separate product |
| **Stability** | Shared attitude smoothing so **stars, lines, and planets** use the same heading/pitch pipeline |
| **Client ephemeris** | `astronomy-engine` (VSOP87) — works **offline** after the page loads |
| **Server ephemeris** | Skyfield **DE421** on Render — dashboard benchmark + optional **batch** vectors when API is online |
| **3D Explorer** | WebGL sphere, horizons, diurnal paths |
| **CV Lab** | Upload frames; OpenCV thresholding vs predicted sky position |
| **Kids / gamification** | Missions, XP, safety quiz, constellation connect-the-dots |

---

## What’s new (November 2026)

- **Production split deploy:** Vercel (frontend + `/constellations/`) + Render (`backend/`), same-origin **`/api` proxy** in [`vercel.json`](vercel.json).
- **API connectivity:** CORS for `*.vercel.app`, `probeServerHealth`, navbar **DE421 API** vs **Local AR**, production `/api` routing fix ([`apiCore.ts`](frontend/src/services/apiCore.ts)).
- **New endpoints:** `GET /api/solar/positions/batch`, `GET /api/geo/declination` (magnetic nudge when GPS is on).
- **AR:** Hybrid DE421/VSOP87 body vectors, adaptive attitude smoothing, **Play** embedded in [`ARSkyView`](frontend/src/features/ar-view/ARSkyView.tsx).
- **Tooling:** `backend/scripts/ar_ephemeris_audit.py`, `probe_deployed_api.py`, expanded pytest.

Details: [`DEPLOYMENT.md`](DEPLOYMENT.md) · [`docs/DRY_RUN_REPORT.md`](docs/DRY_RUN_REPORT.md)

---

## Architecture

```
Phone browser
  ├─ Vercel CDN ── React SPA (frontend/)
  │     ├─ astronomy-engine ── AR @ 60 FPS (works offline)
  │     └─ fetch /api/* ── same origin
  │
  └─ Vercel rewrite /api → Render
        └─ FastAPI (backend/) ── Skyfield DE421, OpenCV vision
```

**Offline?** No Wi‑Fi → no Vercel/Render, but **AR overlay still runs** on local ephemeris. **DE421** needs internet.

---

## Repository layout

| Path | Role |
|------|------|
| [`frontend/`](frontend/) | Main React + Vite app (Dashboard, AR, 3D, CV, missions) |
| [`backend/`](backend/) | FastAPI, DE421, solar/catalog/vision APIs |
| [`skymap-web/`](skymap-web/) | Constellation AR + Play (bundled to `/constellations/`, also **AR → Play**) |
| [`DEPLOYMENT.md`](DEPLOYMENT.md) | Vercel + Render + Docker |
| [`docker-compose.yml`](docker-compose.yml) | Single-container unified deploy |

---

## Quick start (local)

**Requires:** Node 18+, Python 3.10+ (3.11 recommended), modern mobile browser for AR (HTTPS or localhost).

```bash
# Terminal 1 — API
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1          # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 — UI
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) — Vite proxies `/api` → port 8000.

**Constellation dev:**

```bash
cd skymap-web && npm install && npm run dev
```

**Tests:**

```bash
cd backend && python -m pytest tests/ -q
cd skymap-web && npm run test:astro && npm run validate:catalog
```

---

## API (Render / local)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | `status: online`, engine info |
| GET | `/api/solar/position` | DE421 az/alt for Sun, Moon, planets |
| GET | `/api/solar/positions/batch` | All bodies + ENU vectors |
| GET | `/api/solar/path` | 24h waypoints + rise/set |
| GET | `/api/geo/declination` | Approx magnetic declination (°) |
| GET | `/api/constellations` | Catalog metadata |
| POST | `/api/vision/process` | OpenCV bright-blob centroid |

Interactive docs: `/docs` on the backend host.

---

## Deploy (short)

1. **Render:** Root `backend/`, start `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
2. **Vercel:** Repo root `./`, uses root [`vercel.json`](vercel.json); set `/api` rewrite to your Render URL.
3. **Env:** Leave `VITE_API_BASE_URL` **unset** on Vercel to use `/api` proxy (recommended).

Full steps: [`DEPLOYMENT.md`](DEPLOYMENT.md)

---

## CGIP foundations (summary)

SkyMap AR demonstrates:

- **Graphics:** ENU frame, pinhole projection, quaternions from device IMU, Three.js / Canvas AR overlay.
- **Image processing:** Grayscale, threshold, morphology, moments; compare optical centroid vs ephemeris angle error.
- **Astronomy:** Topocentric azimuth/altitude, refraction, client vs server ephemeris parity.

Deep dives: [`PROJECT_RESEARCH.md`](PROJECT_RESEARCH.md) · [`IMPLEMENTATION_ROADMAP.md`](IMPLEMENTATION_ROADMAP.md) · [`backend/README.md`](backend/README.md) · [`frontend/README.md`](frontend/README.md)

---

## Safety

> **Never look at the real Sun through an unfiltered camera, telescope, or binoculars.** Permanent eye and sensor damage can result. Use ISO 12312-2 solar filters for direct observation.

The in-app **safety banner** reminds users; see [`SafetyBanner.tsx`](frontend/src/components/SafetyBanner.tsx).

---

## Implementation status

**Last updated:** 2026-11-25

| Phase | Status | Notes |
|-------|--------|--------|
| Scaffold & API | Done | FastAPI, Vite, health, solar, vision |
| Dashboard & DE421 compare | Done | Live + batch API |
| 3D explorer & AR | Done | BOTH/PLANETS/CONSTELLATIONS, calibration |
| Constellation Play | Done | Unified AR tab + `/constellations/` |
| Production deploy | Done | Vercel + Render, `/api` proxy |
| Device QA | Ongoing | Compass/gyro vary by phone — use calibrate + Align to Sun/Moon |

More tracking: [`PROGRESS.md`](PROGRESS.md)

---

## License

MIT — academic CGIP research and laboratory use.

Developed for **Computer Graphics & Image Processing** coursework; citations and sources in [`RESEARCH_SOURCES.md`](RESEARCH_SOURCES.md).