# SkyGazer AR: Implementation Roadmap & Development Plan

This document establishes the milestone-driven engineering roadmap for constructing the **SkyGazer AR** system. It specifies tasks, technical dependencies, concrete deliverables, and quantifiable acceptance criteria for each phase.

---

## Roadmap Overview

```
[Phase 1: Project Setup] ──► [Phase 2: Ephemeris API] ──► [Phase 3: Solar Dashboard]
                                                                  │
                                                                  ▼
[Phase 6: AR Marker Overlay] ◄── [Phase 5: Camera & Sensor] ◄── [Phase 4: 3D Sky Engine]
         │
         ▼
[Phase 7: OpenCV Vision Lab] ──► [Phase 8: Benchmarking & Final Delivery]
```

---

## Phase 1: Project Initialization & Environment Setup
- **Milestone Goal:** Establish clean monorepo architecture, linting, build pipelines, and virtual environments.
- **Tasks:**
  - Create standard directory structure (`/frontend`, `/backend`, `/docs`).
  - Initialize Vite + React 18 + TypeScript project with Tailwind CSS and Lucide icons.
  - Initialize Python 3.11 virtual environment with FastAPI, Uvicorn, Skyfield, OpenCV, and NumPy.
  - Configure root and local `.gitignore`, VSCode settings, and initial Git repository.
- **Dependencies:** Node.js $\ge 18$, Python $\ge 3.10$, npm.
- **Deliverables:**
  - Running frontend dev server (`npm run dev`) rendering template UI.
  - Running backend dev server (`uvicorn app.main:app`) serving `GET /api/health`.
- **Acceptance Criteria:**
  - `GET /api/health` returns HTTP 200 with `{"status": "online"}`.
  - Frontend TypeScript compile passes with zero errors (`tsc --noEmit`).

---

## Phase 2: Solar Ephemeris API (FastAPI + Skyfield)
- **Milestone Goal:** Implement authoritative server-side astronomical calculation engine using NASA JPL DE421 ephemeris.
- **Tasks:**
  - Implement `app/core/ephemeris.py` to cache and load `de421.bsp` and timescale data.
  - Implement `app/services/solar_calculator.py` computing topocentric azimuth, altitude, distance, and atmospheric refraction.
  - Implement `app/api/endpoints/solar.py` exposing `GET /api/solar/position` and `GET /api/solar/path`.
  - Add Pydantic v2 schemas validating latitude, longitude, and timestamps.
- **Dependencies:** Phase 1 completion, `skyfield`, `numpy`.
- **Deliverables:**
  - Tested `/api/solar/position` and `/api/solar/path` endpoints.
  - Automated pytest suite verifying coordinates against known reference values.
- **Acceptance Criteria:**
  - Calculated solar azimuth and altitude match NREL SPA reference benchmarks within $\pm 0.02^\circ$.
  - Bad coordinate inputs (e.g. `latitude=95.0`) return HTTP 422 with validation errors.

---

## Phase 3: Solar Dashboard & In-Browser Ephemeris
- **Milestone Goal:** Deliver a responsive, interactive solar data dashboard with zero-latency client calculations.
- **Tasks:**
  - Install and configure `astronomy-engine` npm package in the React frontend.
  - Build `useGeolocation` hook with fallback to manual geodetic coordinate inputs.
  - Create `SolarDashboard` component displaying live Azimuth, Altitude, Distance, and Declination.
  - Create Ephemeris Event Cards: Sunrise, Solar Noon, Sunset, and daylight duration.
  - Integrate comparison toggle benchmarking client `astronomy-engine` against FastAPI backend `/api/solar/position`.
- **Dependencies:** Phase 2 backend (for verification).
- **Deliverables:**
  - Interactive dashboard page accessible on desktop and mobile browsers.
- **Acceptance Criteria:**
  - Dashboard updates values continuously every second in live mode.
  - Discrepancy between client and server calculations is quantitatively reported and $< 0.05^\circ$.

---

## Phase 4: 3D Celestial Sphere Engine (Three.js & WebGL)
- **Milestone Goal:** Construct an interactive, orbital 3D planetarium displaying celestial geometry.
- **Tasks:**
  - Configure Three.js canvas with perspective camera and `OrbitControls`.
  - Render celestial sphere wireframe, cardinal compass markers (N, S, E, W), and observer horizon plane.
  - Render 24-hour diurnal solar trajectory spline using `THREE.CatmullRomCurve3`.
  - Visually differentiate above-horizon (golden visible path) and below-horizon (sub-horizon dashed path).
  - Place interactive 3D Sun mesh with radial corona glow shader at instantaneous calculated ENU vector.
- **Dependencies:** Phase 3 coordinate pipeline, `three`, `@types/three`.
- **Deliverables:**
  - `3DSkyExplorer` interactive page with free orbital rotation and zoom.
- **Acceptance Criteria:**
  - Sustained $\ge 60$ FPS rendering on desktop and mobile viewports.
  - Solar mesh aligns with computed ENU direction vector $\mathbf{s}_{\text{world}}$.

---

## Phase 5: Camera Passthrough & Device Sensor Telemetry
- **Milestone Goal:** Access device hardware camera feed and orientation sensors with robust permission management.
- **Tasks:**
  - Implement `useCameraStream` hook requesting `facingMode: 'environment'` at optimal video resolution.
  - Implement `useDeviceOrientation` hook listening to `DeviceOrientationEvent` ($\alpha, \beta, \gamma$).
  - Build iOS 13+ permission dialog handling `DeviceOrientationEvent.requestPermission()`.
  - Implement fallback desktop orientation drawer with interactive yaw, pitch, and roll sliders.
- **Dependencies:** Phase 1, secure HTTPS or localhost context.
- **Deliverables:**
  - Camera viewport with live telemetry HUD displaying orientation angles and compass heading.
- **Acceptance Criteria:**
  - Camera stream plays smoothly without aspect ratio distortion across portrait and landscape.
  - On unsupported devices, manual sliders seamlessly control the orientation state.

---

## Phase 6: Augmented Reality Sun Marker & Calibration Overlay
- **Milestone Goal:** Overlay synthetic Sun marker onto live camera video using pinhole perspective projection.
- **Tasks:**
  - Construct camera intrinsic matrix $\mathbf{K}$ from viewport dimensions and vertical field of view ($\theta_v$).
  - Transform ENU solar vector into camera coordinate frame using device rotation quaternion $\mathbf{q}$.
  - Project 3D camera vector onto 2D screen coordinates $(u, v)$ via perspective division.
  - Render custom GLSL additive glow Sun reticle over camera canvas.
  - Implement Calibration Drawer: manual azimuth/altitude nudge sliders ($\pm 10^\circ$) and FOV adjustment slider ($40^\circ - 80^\circ$).
- **Dependencies:** Phase 4 (shaders), Phase 5 (camera + orientation).
- **Deliverables:**
  - Functional `ARSkyView` page with real-time AR solar tracking.
- **Acceptance Criteria:**
  - Sun marker moves smoothly in response to device rotation.
  - Off-screen indicator appears when the Sun is outside the current camera frustum.

---

## Phase 7: OpenCV Computer Vision Lab (Backend Microservice)
- **Milestone Goal:** Implement classical computer vision pipeline to extract solar centroids from captured images.
- **Tasks:**
  - Implement backend `app/api/endpoints/vision.py` accepting multipart image uploads.
  - Implement OpenCV processing pipeline: Grayscale, Gaussian blur, binary thresholding, morphological opening/closing, and contour moment calculation.
  - Build frontend `CVLab` page permitting image file upload or live camera frame capture.
  - Display side-by-side comparison: raw image vs. segmented binary mask with overlaid centroid marker.
  - Compute and display pixel displacement and angular error relative to mathematical ephemeris prediction.
- **Dependencies:** Phase 2, `opencv-python-headless`, `numpy`.
- **Deliverables:**
  - Fully functional Computer Vision Lab page and verified backend vision endpoint.
- **Acceptance Criteria:**
  - Generates detected centroid coordinates $(\bar{x}, \bar{y})$ in $< 250\text{ ms}$ for 1080p images.
  - Gracefully handles images with zero bright regions without runtime exceptions.

---

## Phase 8: Integration, Benchmarking, and Evaluation
- **Milestone Goal:** Final end-to-end testing, experimental data logging, performance profiling, and documentation.
- **Tasks:**
  - Execute automated end-to-end test suite across frontend and backend.
  - Conduct experimental test runs logging results in `PROJECT_RESEARCH.md` Table 19.3.
  - Profile Chrome DevTools memory allocation and frame rates to confirm zero leaks.
  - Verify complete markdown documentation across all project artifacts.
- **Dependencies:** Phases 1 through 7.
- **Deliverables:**
  - Complete, functional, fully documented SkyGazer AR repository.
  - Populated experimental benchmark summary and final evaluation report.
- **Acceptance Criteria:**
  - All automated unit and API tests pass ($100\%$ green).
  - Codebase strictly adheres to project guidelines (clean TypeScript, Pydantic validation, documented mathematical formulas).
