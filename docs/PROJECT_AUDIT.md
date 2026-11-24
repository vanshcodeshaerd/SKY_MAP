# SkyMap AR/VR — Stage 0 Project Audit

**Date:** 2026-01-15 (audit pass)  
**Repository:** `SKY_MAP` (CGIP workspace)  
**Primary spec client:** `skymap-web/` (constellation-focused AR/planetarium)  
**Secondary product:** `frontend/` + `backend/` (SkyGazer AR: solar, missions, CV lab)

---

## 1. Current architecture

| Layer | Technology | Entry |
|-------|------------|--------|
| SkyMap AR/VR | Vite, TypeScript, Canvas2D (+ optional Three.js), WebXR stub | `skymap-web/src/main.ts` |
| SkyGazer UI | React 18, Tailwind, Three.js / R3F | `frontend/src/App.tsx` |
| API | FastAPI, Skyfield, OpenCV | `backend/app/main.py` |

Data for constellations is **bundled locally** (d3-celestial / IAU boundaries). Planets in SkyGazer use **astronomy-engine**; skymap-web now uses astronomy-engine for planets after this pass.

---

## 2. Working functionality (skymap-web)

- **Celestial modes:** `BOTH` (default), `PLANETS`, `CONSTELLATIONS` via `visibilityFromMode()` — scene-layer filtering, no camera restart.
- **Catalog:** 88 constellations meta, 741 stick lines, 4087+ stars (V ≤ 5.8 + line endpoints), IAU boundary GeoJSON.
- **Coordinate pipeline:** ICRS unit vectors → `SkyState` → ENU (`icrsToEnu`) → device matrix → pinhole projection (`projection.ts`).
- **Horizontal math:** GMST/LST, quadrant-safe azimuth (`astronomy/fast.ts`).
- **Recognition:** Boresight RA/Dec, IAU bounds, cone search, hysteresis tracker, constellation card, next-constellation suggestions, debounced SIMBAD.
- **AR sensors:** DeviceOrientation, iOS compass, declination nudge, light fusion, calibration modal, compass HUD.
- **UI:** Layer drawer (Bortle, Sobel, night red), time slider, search (⌘K), planet chips, planetarium mode, measure mode.
- **Backend (repo):** `/api/stars`, `/api/constellations`, solar, vision — used mainly by SkyGazer, not skymap-web runtime.

---

## 3. Broken or weak areas (pre-fix baseline)

| Issue | Severity | Notes |
|-------|----------|--------|
| AR misalignment on some devices | High | W3C vs compass conventions sensitive; beta/gamma at gimbal lock |
| Constellation lines as flat screen chords | Medium | Fixed: great-circle tessellation in `buildScene.ts` |
| 2 dangling HIP line refs (Per) | Medium | Fixed: include line-endpoint stars in catalog build |
| Planets via analytic Kepler | Medium | Fixed: astronomy-engine topocentric equator |
| Measure arc cosmetic screen curve | Medium | Fixed: spherical arc projected through camera |
| WebGL/WebXR not primary render path | Medium | Canvas2D default; WebGL optional in layer drawer |
| Dual codebases (skymap-web vs React AR) | High | React lacked unified BOTH/PLANETS/CONSTELLATIONS (addressed in `ARSkyView`) |
| `test-astronomy.mjs` Node TS import | Low | Fixed: `npm run test:astro` via `tsx` |
| Madgwick / full WMM | Low | Simplified fusion + declination table stub |
| Stellarium ±0.05° certification | Low | Not automated against Stellarium binary |

---

## 4. SkyGazer (`frontend/`) audit summary

- **Strengths:** VSOP87-class client ephemeris, rich AR UI, sub-horizon planets, gamification, 3D explorer, CV lab.
- **Gaps vs spec:** No single segmented **BOTH / PLANETS / CONSTELLATIONS** control (separate toggles); constellation data from lightweight `starCatalog` vs full IAU graph in skymap-web.
- **Recommendation:** Keep React app for course deliverables (solar/CV); use **skymap-web** as reference implementation for constellation accuracy; port mode selector pattern into AR (done this pass).

---

## 5. Recommended implementation sequence (Stages 1–7)

1. **Data & engine** — Catalog validation, spherical helpers, astronomy-engine planets ✅ (this pass)  
2. **Rendering** — Great-circle lines, layer visibility, planet sprites ✅ partial  
3. **AR** — Sensor warnings, calibration, fusion tuning (ongoing)  
4. **Recognition** — Already present; tune thresholds with field tests  
5. **Planets** — astronomy-engine + cards ✅  
6. **VR / education** — Planetarium mode exists; WebXR best-effort  
7. **Verification** — `validate:catalog`, `test:astro`, manual mobile matrix  

---

## 6. Dependencies

- d3-celestial data (MIT-style academic use; attribute in app)  
- astronomy-engine (npm)  
- SIMBAD TAP (optional, debounced)  
- Skyfield DE421 (backend verification)  

---

## 7. Non-destructive policy

Do not remove SkyGazer welcome/missions/CV. Enhance `skymap-web` and align React AR filtering with the same visibility model without rewriting the entire `ARSkyView` monolith in one step.