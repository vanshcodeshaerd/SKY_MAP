# SkyMap AR/VR — Stage 0: Project Audit

**Audit Date:** 2026-11-25  
**Repositories Audited:** `skymap-web/` (Primary AR/VR Web Client) & `backend/` (FastAPI Ephemeris & Vision Microservice)

---

## 1. Current Architecture

### Frontend (`skymap-web/`)
- **Stack:** Vite 8 + TypeScript 6 + Three.js (`0.175.0`) + Tailwind CSS (via CDN in `index.html`) + `@vitejs/plugin-basic-ssl` (HTTPS for mobile camera/sensor APIs).
- **Astronomy Engine:**
  - `src/astronomy.ts`: Meeus low-precision `sunAltAz()` and `moonAltAz()`.
  - `src/astronomy/fast.ts`: `equatorialToHorizontal()` using `Math.atan2` and `horizontalToEquatorial()`.
  - `src/astronomy/icrs.ts`: J2000 ICRS unit vector builder.
  - `src/astronomy/skyTransform.ts`: $\mathbf{M}_{\text{sky}\to\text{ENU}} = \mathbf{R}_x(90^\circ - \phi) \cdot \mathbf{R}_z(LST)$.
  - `src/astronomy/precision.ts`: Precession + proper motion (`applyProperMotion`), spherical angular separation (`angularSeparationDeg`).
  - `src/planets.ts`: Simplified Keplerian elements for Mercury, Venus, Mars, Jupiter, Saturn.
- **Data Catalog (`src/data/`):**
  - `stars.initial.json` (~42 KB), `stars.intermediate.json` (~132 KB), `stars.advanced.json` (~546 KB, $V \le 5.8$ Hipparcos stars).
  - `constellations.meta.json` (all 88 IAU constellations), `constellations.lines.json` (d3-celestial / XHIP stick-figure segments), `constellations.bounds.json` (IAU polygon boundaries), `dso.messier.json`.
- **Rendering:**
  - `src/render/Canvas2DRenderer.ts`: 2D overlay on `#ar-canvas`.
  - `src/render/WebGLRenderer.ts`: Three.js point-sprite starfield.
  - `src/render/WebXRRenderer.ts`: Immersive VR stub.
  - `src/planetarium.ts`: 360° drag/touch dome.

### Backend (`backend/`)
- **Stack:** FastAPI + Skyfield + NumPy + OpenCV-headless + Pydantic.
- **Existing Endpoints:** `/api/health`, `/api/solar/*`, `/api/vision/*` (currently focused only on Sun/Moon tracking and horizon vision).

---

## 2. Existing Working Functionality
1. HTTPS Vite dev server with rear-camera `getUserMedia()` passthrough (`src/camera.ts`).
2. Continuous `navigator.geolocation.watchPosition()` (`src/location.ts`).
3. iOS `DeviceOrientationEvent.requestPermission()` + Android `deviceorientationabsolute` listener (`src/orientation.ts`).
4. Real Hipparcos star catalog (`stars.advanced.json`) and 88 IAU constellation line/boundary JSON datasets (`src/catalog.ts`).
5. ICRS inertial caching in `src/sky/SkyState.ts` and `atan2` horizontal math in `src/astronomy/fast.ts`.
6. Production Vite build (`npm run build`) compiles cleanly.

---

## 3. Critical Defects & Root Causes Identified

### Defect 1: Inverted / Rear-Camera Z-Axis & Heading Sign Mismatch in AR Alignment
- **Location:** `src/orientation.ts`, `src/projection.ts`, `src/recognition.ts`.
- **Root Cause:**
  1. `orientation.ts` converts W3C `alpha` (counter-clockwise from North) into clockwise compass heading (`360 - e.alpha`), and `main.ts` / `buildScene.ts` passes that clockwise heading into `orientationMatrix(alphaDeg, betaDeg, gammaDeg)` which implements the W3C **CCW** Z-X'-Y'' rotation matrix. Turning East (`heading = 90°`) rotates the camera matrix **West** (`+90°` CCW)!
  2. In W3C device coordinates, $+Z_{\text{device}}$ points **out of the front screen** toward the user's face, while the **rear camera** looks along $-Z_{\text{device}}$. `worldToCamera()` and `project()` check `if (vCam.z <= 0) return null`, which causes stars directly in front of the rear camera to be treated as behind the camera (`z < 0`)!
  3. `recognition.ts` (`boresightHorizontal`) reads `+R[0][2], +R[1][2], +R[2][2]` (`+Z_device`, pointing behind the user) instead of `-Z_device` (rear camera optical axis).

### Defect 2: Broken Planetary Math & Unrendered Planets
- **Location:** `src/planets.ts`, `src/scene/buildScene.ts`, `src/main.ts`.
- **Root Cause:**
  1. `planets.ts` computes $360 \cdot T / a^3$ (wrong Kepler period & wrong time units—`T` is in centuries), treats heliocentric ecliptic longitude directly as geocentric RA, and adds a fabricated `Math.sin(T) * 5` term to Dec.
  2. `main.ts` calls `planetAltAz()` and discards the result; `buildScene.ts` never projects or renders Mercury, Venus, Mars, Jupiter, or Saturn.

### Defect 3: Missing Independent Viewing Modes (`BOTH | PLANETS | CONSTELLATIONS`)
- **Location:** `index.html`, `src/main.ts`, `src/scene/buildScene.ts`, `src/render/`.
- **Root Cause:** No segmented mode selector or independent `CelestialScene` layer filtering exists.

### Defect 4: Planetarium Mode Hides the Star Canvas
- **Location:** `src/render/Canvas2DRenderer.ts` line 28.
- **Root Cause:** `setMode('VR_PLANETARIUM')` sets `#ar-canvas` to `display: none`, hiding all stars, constellation lines, and bodies whenever the user switches to `SKY` (Planetarium) mode.

### Defect 5: `useIosTrueNorth` Always `true` on All Browsers
- **Location:** `src/main.ts` line 297.
- **Root Cause:** `typeof window.DeviceOrientationEvent !== 'undefined'` evaluates `true` on Android and Desktop, bypassing WMM magnetic declination correction.

### Defect 6: Constellation Line Clipping & Great-Circle Interpolation
- **Location:** `src/scene/buildScene.ts` lines 78–90.
- **Root Cause:** Lines are hidden if either endpoint is off-screen (`a?.onScreen && b?.onScreen`) instead of clipping at the camera near-plane ($z_{\text{cam}} > 0$) and viewport edges.

### Defect 7: Incomplete Constellation Educational Metadata & Next Constellation Logic
- **Location:** `src/data/constellations.meta.json`, `src/ui/constellationCard.ts`, `src/recognition.ts`.
- **Root Cause:** No distinction between historical cultural origin and IAU standardization (1922/1928/1930); no hysteresis/confidence scoring in recognition; no contextual "Next Constellation" (Next in View / Next Visible / Nearest); no planetary info cards or star selection details outside Measure mode.

### Defect 8: Backend Missing Astronomical Catalog, Constellation, Planet & Observation APIs
- **Location:** `backend/app/api/`.
- **Root Cause:** Backend only implements `/api/solar/*` and `/api/vision/*`; missing `/api/stars`, `/api/constellations`, `/api/planets`, `/api/sky/*`, `/api/observations`, and `/api/user/preferences`. Also `skyfield` is not installed in the global Python 3.13 environment (`CGIP LAB/.venv` or system Python lacks `skyfield`).

---

## 4. Recommended Implementation Sequence
1. **Stage 1:** Fix astronomical math (`planets.ts`, `astronomy/fast.ts`, `projection.ts` rear-camera & W3C heading alignment), create catalog validation script, and build automated math & catalog unit tests.
2. **Stage 2:** Refactor `SkySceneData` and renderers for independent `BOTH | PLANETS | CONSTELLATIONS` layer filtering, proper near-plane frustum line clipping, distinct 3D/2D planetary rendering, and fix Planetarium visibility.
3. **Stage 3:** Upgrade AR sensor fusion, calibration modal (permissions, sensor health, reset alignment), live 8-point compass HUD (`N | NE | E | SE | S | SW | W | NW`), and screen orientation handling.
4. **Stage 4:** Implement intelligent constellation recognition (confidence + hysteresis + debouncing), rich educational info panel (IAU 1922/1928/1930 vs historical origin, main stars), and contextual Next Constellation navigation.
5. **Stage 5:** Complete Planetary Experience (interactive planet selection, rise/transit/set, magnitude, angular diameter, distinct visuals).
6. **Stage 6:** Upgrade VR Planetarium + WebXR + Search + Time Machine + Angular Distance + Bortle Simulation + Night Red Mode.
7. **Stage 7:** Implement Backend API endpoints (`/api/stars`, `/api/constellations`, `/api/planets`, `/api/sky/*`, `/api/observations`, `/api/user/preferences`), run full automated tests, and write `docs/IMPLEMENTATION_REPORT.md`.
