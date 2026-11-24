# SkyGazer AR & 3D Celestial Planetarium — Frontend Master Specification 🌌🔭
**Complete Technical Architecture, UI/UX Design System, 3D Graphics & Sensor Specification**

---

## 1. Executive Summary & Product Vision

**SkyGazer AR** is a responsive, web-based Augmented Reality (AR) and 3D Interactive Planetarium application built for mobile phones, tablets, and desktop browsers. It allows users to:
1. **Target Celestial Bodies in Real-Time AR**: Point mobile cameras at the sky to see exact real-time overlays of the Sun, Moon, and 8 planets with a dynamic targeting reticle and off-screen directional navigation arrows.
2. **Explore the 3D Solar System & Celestial Sphere**: Interact with realistic 3D textured celestial bodies (high-poly spheres with procedural bump maps, atmospheric back-scattering glow, and Saturn's rings) inside an interactive Three.js planetarium with a 24-hour diurnal simulation slider.
3. **Inspect Real-Time Ephemeris Data**: View live topocentric coordinates (Azimuth, Altitude, Right Ascension, Declination, Distance, and Moon Illumination) calculated offline in the browser at 60 FPS using pure astronomical mathematics.
4. **Experiment with Computer Vision (CV Lab)**: Analyze solar disks, threshold high-luminance image regions, and compute optical centroids using OpenCV algorithms.
5. **Gamification & Quests**: Earn Stargazer XP, complete daily alignment quests (e.g., "Align with Jupiter", "Golden Hour Gazer"), and unlock discovery badges.

---

## 2. Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | **React 18 + TypeScript** | Declarative state, strict static typing for vector math |
| **Build Tool** | **Vite** | Instant HMR, modern ES modules, production bundling |
| **3D Graphics** | **Three.js + WebGL 2.0** | 3D celestial sphere, textured planets, atmospheric glow, lighting |
| **Styling** | **Tailwind CSS + Lucide Icons**| Astronomy dark cosmos theme (`#0B0F19`), glassmorphism, responsive HUD |
| **Astronomical Math** | **`astronomy-engine` (v2.1+)** | Client-side ephemeris (sub-arcminute topocentric Az/Alt for Sun, Moon, Planets) |
| **Sensor Fusion** | **W3C DeviceOrientation & Geolocation** | IMU accelerometer/gyroscope/magnetometer reading + GPS coords |
| **Camera Feed** | **W3C MediaDevices (`getUserMedia`)** | Ultra-low latency camera stream with rear (`environment`) auto-selection |
| **Deployment** | **Vercel** / **Static CDN** | Zero-latency edge hosting with mandatory HTTPS for camera/sensor access |

---

## 3. Directory & Component Architecture

```
frontend/
├── public/
│   └── favicon.ico
├── src/
│   ├── components/                # Reusable UI & Layout Components
│   │   ├── ui/                    # Base buttons, cards, sliders, badges
│   │   ├── Navbar.tsx             # Responsive nav bar with GPS status & view switcher
│   │   ├── SafetyBanner.tsx       # Mandatory persistent solar eye safety alert
│   │   └── CalibrationDrawer.tsx  # FOV calibration ($40°-80°$) & compass offset sliders
│   ├── features/                  # Page-Level Functional Modules
│   │   ├── dashboard/             # Live Ephemeris Telemetry & Solar event cards
│   │   ├── ar-view/               # Camera stream + WebGL overlay canvas + Reticle + Pointer
│   │   ├── sky-explorer/          # Three.js 3D celestial planetarium scene
│   │   ├── cv-lab/                # Image thresholding, contour detection & centroid lab
│   │   └── gamification/          # Stargazer XP, quests, badges & scan achievements
│   ├── hooks/                     # Hardware & Sensor Integration Hooks
│   │   ├── useGeolocation.ts      # W3C Geolocation API with fallback coordinates
│   │   ├── useDeviceOrientation.ts# W3C DeviceOrientation IMU handler with iOS permission request
│   │   └── useCameraStream.ts     # MediaDevices video stream lifecycle manager
│   ├── services/                  # Mathematical Engines & Network Clients
│   │   ├── astronomyEngine.ts     # Client-side topocentric ephemeris provider
│   │   ├── coordinateTransforms.ts# Az/Alt to ENU 3D vectors, Quaternion & Pinhole projection
│   │   ├── planetTextures.ts      # Procedural canvas textures & bump maps for all celestial bodies
│   │   └── api.ts                 # Axios/Fetch client connecting to FastAPI backend
│   ├── types/                     # Shared TypeScript Definitions
│   │   └── astronomy.ts
│   ├── App.tsx                    # Root routing, global simulation clock & state
│   ├── main.tsx                   # React root mount
│   └── index.css                  # Global Tailwind CSS definitions
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vercel.json                    # Vercel SPA routing rewrite rules
```

---

## 4. UI/UX Design System & Color Palette

### Color Palette (Cosmic Theme)
- **Deep Space Background:** `#0B0F19` (Obsidian Blue-Black)
- **Surface / Card Background:** `rgba(17, 24, 39, 0.75)` (Glassmorphism backdrop-blur-md)
- **Border / Subtle Rings:** `rgba(255, 255, 255, 0.1)`
- **Solar Gold Accent:** `#F59E0B` (Sun, Daytime trajectory, Primary highlights)
- **Lunar Silver Accent:** `#E2E8F0` (Moon, Horizon grid, Reference lines)
- **Cosmic Cyan Accent:** `#06B6D4` (Telemetry, Compass bearings, Reticle targets)
- **Atmospheric Glows:** Custom three.js back-side glow shaders per planet (Venus gold, Mars rust, Neptune azure).

---

## 5. Mathematical Coordinate Transformation Pipeline

The frontend converts real-world celestial positions into on-screen AR pixels via a 4-stage pipeline:

```
1. Topocentric Coordinates (Azimuth A, Altitude h) [Calculated via astronomy-engine]
   │
   ▼ [coordinateTransforms.ts: azAltToEnuVector()]
2. 3D Unit Vector in World Space (East-North-Up Frame):
   s_x = cos(h) * sin(A)  (East)
   s_y = cos(h) * cos(A)  (North)
   s_z = sin(h)           (Up)
   │
   ▼ [useDeviceOrientation.ts: orientationEulerToQuaternion()]
3. Camera-Space Rotation Matrix R_world_to_cam (Derived from Device IMU):
   q = R_z(alpha) * R_x(beta) * R_y(gamma)
   s_cam = R_world_to_cam * s_world
   │
   ▼ [Pinhole Perspective Projection: K-Matrix]
4. Normalized Device Coordinates (NDC) & Screen Pixels (u, v):
   x_n = X_cam / Z_cam,   y_n = Y_cam / Z_cam
   u = (W / 2) + x_n * (W / (2 * tan(HFOV / 2)))
   v = (H / 2) - y_n * (H / (2 * tan(VFOV / 2)))
```

### Off-Screen Navigation Arrow Math
If the celestial body is outside the screen camera frustum ($Z_{\text{cam}} \le 0$ or $(u, v)$ outside viewport boundaries $[0, W] \times [0, H]$):
$$\theta = \text{atan2}(v - H/2, u - W/2)$$
$$u_{\text{clamped}} = \frac{W}{2} + R \cos(\theta), \quad v_{\text{clamped}} = \frac{H}{2} + R \sin(\theta)$$
An interactive directional arrow points the user precisely towards where to turn the phone to find the planet!

---

## 6. Core Features Specification

### A. AR Sky View (`ARSkyView.tsx`)
- **Live Video Stream:** HTML5 `<video>` rendered full-screen with CSS `object-fit: cover`.
- **Target Reticle:** Concentric glowing HUD rings with animated crosshairs that lock on when within $5^\circ$ of the target.
- **Directional Pointer:** Pulsing arrow on screen edge when the target is off-screen.
- **3D Planet Overlay:** Interactive rotating 3D textured planet sphere rendered directly at the celestial coordinates.
- **Calibration Drawer:** Sliders for Azimuth Nudge ($\pm 30^\circ$), Altitude Nudge ($\pm 20^\circ$), and Camera FOV ($40^\circ - 80^\circ$).

### B. 3D Sky Explorer (`ThreeSkyExplorer.tsx`)
- **3D Celestial Sphere:** Radius $R = 100$, with starry background mesh and celestial equator.
- **Realistic 3D Planets:**
  - High-poly spheres (`SphereGeometry(radius, 64, 64)`).
  - Procedural Canvas Textures: Continental bands, crater noise, Jupiter storms, Saturn ring geometry.
  - Procedural Bump Mapping: Height reliefs for Moon craters, Martian canyons, and Mercury ridges.
  - Volumetric Atmospheric Glow: Inverted back-face shader material with customized planetary atmospheric tint.
- **Controls & Time Scrubbing:** OrbitControls with damping, 24-hour diurnal trajectory curve, and "Live Time" lock/unlock button.

### C. Solar & Ephemeris Dashboard (`SolarDashboard.tsx`)
- **Real-Time Telemetry Cards:** Azimuth, Altitude, Declination, Right Ascension, Distance (AU / km).
- **Ephemeris Milestones:** Astronomical Sunrise, Solar Noon, Sunset, Day Length, Dawn & Dusk Twilight timings.
- **Moon Phase Tracker:** Waxing/Waning crescent, gibbous, full moon percentage illumination and phase name.

### D. Computer Vision Lab (`CVLab.tsx`)
- **Image Upload:** Upload daylight or sky photos.
- **Interactive Thresholding:** Threshold slider ($100 - 255$) to isolate the solar core.
- **Centroid Overlay:** Displays the computed center of luminance $(\bar{x}, \bar{y})$ and contours over the image.

### E. Gamification System (`gamification/`)
- **User XP & Levels:**
  - Novice Stargazer (0 - 200 XP)
  - Night Sky Apprentice (200 - 600 XP)
  - Solar Navigator (600 - 1500 XP)
  - Master Astronomer (1500+ XP)
- **Planetary Discovery Badges:**
  - ☀️ *Helios Seeker*: Align with the Sun during peak daylight.
  - 🌙 *Lunar Observer*: Spot the Moon across 3 different lunar phases.
  - 🪐 *Lord of the Rings*: Align with Saturn.
  - 🔴 *Red Planet Rover*: Spot Mars in the AR view.
- **Daily Celestial Quests:** 3 random daily alignment challenges granting +50 to +150 XP upon maintaining alignment for 3 seconds.

---

## 7. Backend API Contract (FastAPI Integration)

The frontend connects to the following REST endpoints (pre-configured with CORS `*`):

| Endpoint | Method | Params / Payload | Description |
| :--- | :--- | :--- | :--- |
| `/api/health` | `GET` | None | Returns engine status & server UTC time |
| `/api/solar/position`| `GET` | `lat`, `lon`, `elevation_m`, `timestamp` | High-precision NASA JPL DE421 ephemeris |
| `/api/solar/path` | `GET` | `lat`, `lon`, `date`, `step_minutes` | 24-hour diurnal waypoints & solar noon |
| `/api/vision/process`| `POST` | `multipart/form-data` (`file`, `threshold`) | OpenCV thresholding & solar centroid |

*Note: The frontend operates 100% autonomously offline using `astronomy-engine` if the backend is unreachable.*

---

## 8. Deployment Configuration (`vercel.json`)

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Build & Run Commands
```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Build production bundle
npm run build

# Preview production build
npm run preview
```
