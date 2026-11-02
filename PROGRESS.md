# SkyGazer AR Implementation Progress

**Last updated:** 2026-11-02

**Summary:** 7 Done · 1 In progress · 1 Partial

| ID | Phase | Status | Evidence / notes |
| --- | --- | --- | --- |
| phase1-scaffold | 1 · Scaffold | **Done** | `backend/app/main.py`, `frontend/` Vite app, root `.gitignore`, health endpoint |
| phase2-ephemeris | 2 · Ephemeris | **Done** | `solar_calculator.py`, `/api/solar/position`, `/api/solar/path`, pytest |
| phase3-dashboard | 3 · Dashboard | **Done** | `SolarDashboard.tsx`, server compare, celestial selector |
| phase4-3d | 4 · 3D view | **Done** | `ThreeSkyExplorer.tsx` |
| phase5-6-ar | 5–6 · AR | **Done** | `ARSkyView.tsx`, `useDeviceOrientation`, `projectEnuToScreen` |
| phase7-cv | 7 · CV lab | **Done** | `vision.py`, `CVLab.tsx`, OpenCV pipeline tests |
| phase3-extras | Extras | **Partial** | Declination/calibration in app; OpenCV.js local path still optional |
| phase-gamification-1 | Gamification · Step 1 | **Done** | Mission engine + localStorage |
| phase-gamification-2 | Gamification · Step 2 | **Done** | Mission Control UI, wiring Dashboard/AR/CV, reset progress |
| phase-gamification-3 | Gamification · Step 3 | **Done** | Daily challenge, collection book, mission debriefs, progress CSV |
| phase8-verify | 8 · Verify | **In progress** | `pytest` 12 passed; `npm run build` OK; device AR/camera QA pending |

## Checklist

- [x] **phase1-scaffold** — Scaffold backend + frontend, CORS, proxy, gitignore, health
- [x] **phase2-ephemeris** — Skyfield APIs, validation, pytest
- [x] **phase3-dashboard** — Dashboard, geolocation, client vs server compare
- [x] **phase4-3d** — Three.js celestial sphere and diurnal path
- [x] **phase5-6-ar** — Camera, orientation, AR overlay, calibration, safety banner
- [x] **phase7-cv** — OpenCV backend + CV Lab UI
- [ ] **phase3-extras** — WMM, complementary filter, OpenCV.js (CSV export via Mission Control)
- [x] **phase-gamification-1** — Mission progress store, 6 missions, localStorage, auto-complete rules
- [x] **phase-gamification-2** — Mission Control panel, step checklists, Continue, mission wiring
- [x] **phase-gamification-3** — Daily sky challenge, collection book, debrief toasts, progress CSV export
- [ ] **phase8-verify** — Full browser/device pass with shared location/time state

## Recent fixes (2026-11-02)

- CORS: explicit origins + LAN regex (fixes invalid `*` + credentials)
- Solar API: validate `body` query param (422 for unknown bodies)
- AR: iOS `webkitCompassHeading` no longer double-applies screen rotation
- Pinhole projection: horizontal focal length uses viewport aspect ratio
- API client: `fetchServerSolarPath` sends `elevation_m`
- Gamification Step 1: mission engine + `localStorage` key `skygazer_missions_v1`
- Gamification Step 3: daily challenge card, planet collection book, mission debrief copy, CSV export

## Verification commands

```powershell
cd backend
.venv\Scripts\python.exe -m pytest -v tests/

cd ..\frontend
npm run build
```
