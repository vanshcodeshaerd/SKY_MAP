# SkyMap AR/VR — Stage 7: Implementation Report

**Date:** 2026-11-25  
**Environment:** `skymap-web/` (Vite 8 + TypeScript 6 + Three.js) & `backend/` (FastAPI)

---

## 1. Completed Features

### Core Viewing Modes (`BOTH | PLANETS | CONSTELLATIONS`)
- Implemented independent scene-layer filtering (`VisibilityConfig` in `src/render/types.ts` and `src/scene/buildScene.ts`) controlled via a segmented `[ BOTH ] [ PLANETS ] [ CONSTELLATIONS ]` header bar in `index.html`.
- `BOTH` is active by default; switching modes is instantaneous at the rendering layer without restarting the camera, geolocation, device orientation, or astronomy engine.
- `PLANETS` hides all constellation lines, labels, and unrelated stars, keeping solar system bodies and planet selection active.
- `CONSTELLATIONS` hides planetary sprites and labels, highlighting all 88 IAU constellations, stick lines, and educational cards.

### Astronomical Engine & AR Alignment Fixes
- **Rear-Camera Handedness & Heading Fix (`src/projection.ts`, `src/orientation.ts`):**
  - Converted clockwise compass heading to W3C counter-clockwise `alpha` (`360 - heading`), added screen-orientation compensation (`getScreenOrientationAngle()`), and negated `Z_device` in `worldToCamera()` and `boresightENU()` so the rear camera (`-Z_device`) maps to `+Z_cam`.
  - Added 3D camera near-plane line clipping (`clipSegmentToNearPlane`) so constellation stick figures no longer vanish when one star crosses behind or outside the frustum.
- **Planetary Ephemeris (`src/planets.ts`):**
  - Replaced broken heliocentric/sinusoidal approximation with Standish/JPL J2000 Keplerian elements + century rates, Newton-Raphson Kepler solver, Earth heliocentric subtraction, obliquity rotation to geocentric `(RA, Dec)`, visual magnitude estimation, angular diameter (arcseconds), and daily Rise / Transit / Set computation for Mercury, Venus, Mars, Jupiter, and Saturn.
- **Quadrant-Safe Horizontal Transform & ICRS Caching (`src/astronomy/fast.ts`, `src/sky/SkyState.ts`):**
  - Fixed star unit vectors cached in J2000 ICRS and transformed periodically into local ENU using `Math.atan2` for `[0°, 360°)` azimuth normalization.

### Constellation Recognition, Educational Info & Next Constellation
- **Boresight Recognition (`src/recognition.ts`):** Uses corrected rear-camera boresight (`boresightENU`), spherical angular separation, confidence scoring, and a 450 ms hysteresis/debounce tracker (`ConstellationTracker`) distinguishing `Coordinate Region Predicted` from `Aligned Stars in FOV`.
- **Educational Info Panel (`src/ui/constellationCard.ts`, `src/data/constellationHistory.ts`):** Answers What Constellation, Origin & IAU Standardization (explicitly distinguishing human sky regions and 1922/1928/1930 IAU standardization from physical formation), Historical vs. IAU Age, Main Stars (magnitude, spectral type, distance), Mythology, and Best Observation Months.
- **Next Constellation Navigation:** Computes `Next in View`, `Next Visible`, and `Nearest` constellations with direction and angular separation.

### AR Calibration, Compass HUD & Planetarium / WebXR
- **8-Point Compass HUD (`src/ui/compassHud.ts`):** Live `N | NE | E | SE | S | SW | W | NW` indicator driven by fused true-north heading (`OrientationFusion` + WMM declination in `src/sensors/wmm.ts`).
- **Calibration Modal (`src/ui/calibrationModal.ts`):** Displays Camera, Location, Motion Sensor, and Compass Health statuses, manual heading offset (`±15°`), and Reset Alignment.
- **Planetarium & WebXR (`src/planetarium.ts`, `src/render/Canvas2DRenderer.ts`, `src/render/WebXRRenderer.ts`):** Fixed `#ar-canvas` visibility in `VR_PLANETARIUM` mode, added `lookAt(az, alt)` navigation from search/cards, distinct Saturn rings & Jupiter cloud bands, Time Machine slider, Bortle scale simulation, Sobel horizon edge filter, and Angular Distance arc tool.

### Backend API (`backend/app/api/endpoints/sky.py`, `backend/app/services/sky_catalog.py`)
- Added `/api/stars`, `/api/stars/{id}`, `/api/constellations`, `/api/constellations/nearby`, `/api/constellations/{id}`, `/api/constellations/{id}/stars`, `/api/planets`, `/api/planets/{id}`, `/api/sky/visible`, `/api/sky/positions`, `/api/sky/next-constellation`, `/api/sky/visibility`, `/api/astronomy/events`, `POST /api/observations`, and `GET/PUT /api/user/preferences`.

---

## 2. Verification & Test Results

| Check | Command | Result |
|---|---|---|
| TypeScript & Vite Production Build | `npx tsc --noEmit` & `npm run build` | **Passed** (52 modules, `dist/` built in 326 ms) |
| Astronomy, Projection & Mode Tests | `node --experimental-strip-types scripts/test-astronomy.mjs` | **Passed** (6 test groups; 5-location RA/Dec ↔ Alt/Az round-trip error $< 0.0001^\circ$, Polaris alt within $1^\circ$ of latitude) |
| Catalog Integrity Validation | `node scripts/validate-catalog.mjs` | **4,086 stars**, **88 IAU constellations**, 0 missing HIP IDs, 0 duplicate lines (2 faint-cutoff edges > V=5.8 in Perseus filtered safely by `catalog.ts`) |
| Backend Sky API Tests | `python -m pytest tests/test_sky_api.py -v` | **4 passed in 0.08s** |

---

## 3. Known Limitations
1. `backend/tests/test_solar_math.py`, `test_api_endpoints.py`, and `test_vision_pipeline.py` require `skyfield` and `opencv-python-headless`, which are not installed in the system Python 3.13 environment here; `/api/sky/*` endpoints use pure Python standard-library `math` and `json` and pass all 4 unit tests.
2. Live mobile camera, iOS `DeviceOrientationEvent.requestPermission()`, and WebXR `immersive-vr` headset sessions require physical mobile/XR hardware over HTTPS (`vite` with `@vitejs/plugin-basic-ssl` is configured for LAN testing).
3. `src/api/simbad.ts` remote SIMBAD queries require internet connectivity; local 4,086-star Hipparcos + 88-constellation catalogs operate offline.
