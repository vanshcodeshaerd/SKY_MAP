# SkyGazer AR — Frontend Application

A responsive, high-performance **React 18 + TypeScript + Three.js + WebGL 2.0** client application providing augmented reality solar tracking, an interactive 3D celestial planetarium, and an interactive Computer Vision experimentation lab.

---

## 🛠️ Tech Stack & Key Libraries

- **React 18:** Component-based UI with declarative state management.
- **TypeScript:** Strict static typing for mathematical vectors, quaternions, and API payloads.
- **Vite:** Next-generation frontend tooling with lightning-fast HMR.
- **Three.js:** WebGL scene graph, perspective camera, `OrbitControls`, and shader materials.
- **Tailwind CSS:** Modern utility-first styling with an astronomy-inspired dark palette.
- **Astronomy Engine (`astronomy-engine`):** Pure TypeScript ephemeris library calculating instant topocentric solar positions directly in the browser at 60 FPS.
- **Lucide React:** Clean, consistent iconography for astronomical and navigation controls.

---

## 📂 Architecture & Directory Structure

```
frontend/
├── public/
│   └── favicon.ico
├── src/
│   ├── components/                # Reusable UI & Layout Components
│   │   ├── ui/                    # Base primitives (Button, Card, Slider, Modal)
│   │   ├── Navbar.tsx             # Main application navigation
│   │   ├── SafetyBanner.tsx       # Mandatory persistent solar eye safety alert
│   │   └── CalibrationDrawer.tsx  # Sliders for manual FOV & orientation nudges
│   ├── features/                  # Page-Level Functional Modules
│   │   ├── dashboard/             # Solar coordinates & ephemeris event cards
│   │   ├── ar-view/               # Camera stream & WebGL overlay canvas
│   │   ├── sky-explorer/          # Three.js 3D celestial sphere scene
│   │   └── cv-lab/                # Image upload, threshold controls, & mask display
│   ├── hooks/                     # Custom Hardware & Sensor Hooks
│   │   ├── useGeolocation.ts      # W3C Geolocation API wrapper
│   │   ├── useDeviceOrientation.ts# W3C DeviceOrientationEvent handler & permissions
│   │   └── useCameraStream.ts     # MediaDevices.getUserMedia video stream manager
│   ├── services/                  # Mathematical Utilities & Network Clients
│   │   ├── astronomyEngine.ts     # Client-side astronomy-engine wrapper
│   │   ├── coordinateTransforms.ts# Az/Alt to ENU, Quaternion & Pinhole projection
│   │   └── api.ts                 # Axios / Fetch client connecting to FastAPI
│   ├── types/                     # Shared TypeScript definitions
│   │   └── astronomy.ts
│   ├── App.tsx                    # Root routing & layout assembly
│   ├── main.tsx                   # React root mount
│   └── index.css                  # Global Tailwind CSS definitions
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md                      # This document
```

---

## 🚀 Installation & Local Execution

### 1. Install Node Dependencies
```bash
# In the frontend directory:
npm install
```

### 2. Start the Vite Development Server
```bash
npm run dev
```
Navigate to [http://localhost:5173](http://localhost:5173).

### 3. Testing on Physical Mobile Devices
To test camera and IMU sensors on a mobile phone:
```bash
npm run dev -- --host
```
Ensure your mobile phone is on the same local Wi-Fi network and access your machine's local IP address (e.g. `https://192.168.1.50:5173`).
*Note: iOS Safari and modern Chrome require a secure context (HTTPS). You can use `vite-plugin-mkcert` to generate local trusted SSL certificates for local testing.*

---

## 📐 Mathematical Transformation Pipeline in Frontend

The frontend implements the complete graphics projection pipeline:

```
1. Topocentric Astronomical Coordinates (Azimuth A, Altitude h)
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
4. Normalized Image Coordinates & Screen Pixels:
   x_n = X_cam / Z_cam,  y_n = Y_cam / Z_cam
   u = f_x * x_n + c_x,  v = f_y * y_n + c_y
```

---

## 📱 Supported Views & Features

1. **Solar Dashboard:** Real-time digital readouts of Azimuth, Altitude, Distance, and Declination; ephemeris cards showing Sunrise, Sunset, and Solar Noon.
2. **AR Sky View:** Live camera stream with transparent WebGL canvas rendering a glowing virtual Sun reticle, cardinal directions, and horizon guides.
3. **3D Sky Explorer:** Orbital 3D planetarium with mouse/touch drag controls, displaying the celestial sphere, observer horizon plane, and 24-hour diurnal solar trajectory spline.
4. **Computer Vision Lab:** Image upload suite enabling real-time experimentation with thresholding parameters and visual verification of solar centroids.
5. **Settings & Calibration:** FOV slider ($40^\circ - 80^\circ$), manual yaw/pitch/roll fallback sliders, and magnetic declination overrides.
