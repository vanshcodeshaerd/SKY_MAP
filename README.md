# SkyGazer AR ☀️🔭
### Browser-Based Solar Tracking, Augmented Reality & Computer Vision Laboratory
*A University-Level Academic Project in Computer Graphics & Image Processing (CGIP)*

[![Tech Stack: React](https://img.shields.io/badge/Frontend-React%2018%20%2B%20TypeScript-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![3D: Three.js & WebGL](https://img.shields.io/badge/3D%20Graphics-Three.js%20%2F%20WebGL-black?logo=three.js)](https://threejs.org/)
[![Backend: FastAPI](https://img.shields.io/badge/Backend-Python%20FastAPI-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Computer Vision: OpenCV](https://img.shields.io/badge/Vision-OpenCV%204-5C3EE8?logo=opencv&logoColor=white)](https://opencv.org/)
[![Astronomy: Skyfield](https://img.shields.io/badge/Ephemeris-NASA%20JPL%20DE421%20%2F%20Skyfield-darkblue)](https://rhodesmill.org/skyfield/)

---

## 📖 Project Overview

**SkyGazer AR** is a browser-accessible solar tracking and augmented reality (AR) application engineered to demonstrate foundational and advanced principles of **Computer Graphics and Image Processing (CGIP)**.

By ingesting geographic coordinates and timestamps, SkyGazer AR calculates the Sun's precise topocentric celestial position (azimuth and altitude), transforms these coordinates into a 3D camera-space projection, and overlays a synthetic, glowing virtual Sun reticle onto a real-time camera feed. 

In addition to live AR tracking, the project incorporates:
1. **Interactive 3D Celestial Sphere:** A full-orbit WebGL planetarium rendering local horizon planes, compass grids, and 24-hour diurnal solar trajectories.
2. **Computer Vision Experimentation Lab:** An OpenCV-powered testbed that extracts bright solar candidate centroids via adaptive thresholding, morphological filtering, and spatial image moments, quantitatively benchmarking optical detections against theoretical astronomical vectors.

---

## 🧠 Brainstorming CGIP & OpenGL / WebGL Foundations

SkyGazer AR is purposefully engineered as an educational laboratory for core Computer Graphics and Image Processing principles:

### 1. Computer Graphics (CG) & OpenGL Foundations
- **Homogeneous Coordinates & Affine Transforms:** Every position in space is represented in $\mathbb{R}^4$ homogeneous space $[x, y, z, 1]^T$, enabling unified matrix multiplication for translation, rotation, and scaling.
- **Model-View-Projection (MVP) Pipeline:**
  $$\mathbf{v}_{\text{clip}} = \mathbf{P}_{\text{proj}} \cdot \mathbf{V}_{\text{view}} \cdot \mathbf{M}_{\text{model}} \cdot \mathbf{v}_{\text{local}}$$
  - **Model Matrix ($\mathbf{M}$):** Places the Sun, ground horizon disc, and trajectory splines in the East-North-Up (ENU) world frame.
  - **View Matrix ($\mathbf{V}$):** Formulated from the inverse camera pose ($[\mathbf{R}_{\text{world}}^{\text{cam}} \mid \mathbf{t}_{\text{cam}}]^{-1}$) derived dynamically from smartphone IMU sensors (accelerometer, gyroscope, magnetometer).
  - **Projection Matrix ($\mathbf{P}$):** Models the camera's intrinsic optical characteristics (focal length and aspect ratio) to project 3D frustum rays onto 2D normalized device coordinates (NDC).
- **Perspective Division & Screen Mapping:** Clip-space coordinates $(x_c, y_c, z_c, w_c)$ undergo perspective division by $w_c$ to yield NDC $[-1, 1]^3$, followed by viewport transformation into screen pixel coordinates $(u, v)$.
- **Custom GLSL Shader Pipelines:**
  - **Vertex Shader:** Transforms 3D vertex positions and computes view-space vectors.
  - **Fragment Shader:** Executes radial distance falloff functions and exponential glow equations to synthesize a realistic solar corona with additive alpha blending (`gl.blendFunc(gl.SRC_ALPHA, gl.ONE)`).
- **Parametric Spline Curves:** Generates smooth 24-hour diurnal trajectory paths using 3D Catmull-Rom splines, partitioned into visible (above horizon) and sub-horizon (below ground) geometries.

### 2. Image Processing (IP) & Computer Vision Foundations
- **Color Space Conversions:** Transforming RGB/BGR camera frames into **Grayscale** (luminance isolation) and **HSV** (Hue-Saturation-Value) to separate intensity from chromaticity and exploit sensor saturation phenomena.
- **Image Filtering & Spatial Convolution:** Gaussian blur kernels ($9\times 9$, $\sigma = 2.0$) to suppress high-frequency digital camera sensor noise.
- **Binarization & Thresholding:** Evaluating fixed luminance cutoffs vs. Otsu's optimal global variance binarization for isolating candidate solar disks.
- **Mathematical Morphology:** 
  - **Opening ($I \circ B$):** Erosion followed by dilation with an elliptical structuring element to eliminate salt-and-pepper noise and specular artifacts.
  - **Closing ($I \bullet B$):** Dilation followed by erosion to bridge fragmented glare boundaries and optical halo gaps.
- **Connected Component Analysis & Spatial Moments:** Contour extraction (`cv2.findContours`) coupled with 0th and 1st order raw spatial moments:
  $$m_{pq} = \sum_{x} \sum_{y} x^p y^q I(x, y) \implies \bar{x} = \frac{m_{10}}{m_{00}}, \; \bar{y} = \frac{m_{01}}{m_{00}}$$
- **Quantitative Angular Error Quantification:** Vector dot products between optical image centroids and astronomical ephemeris predictions:
  $$\theta_{\text{err}} = \arccos\left(\frac{\mathbf{v}_{\text{pred}} \cdot \mathbf{v}_{\text{optical}}}{\|\mathbf{v}_{\text{pred}}\| \|\mathbf{v}_{\text{optical}}\|}\right)$$

---

## 🛠️ Technology Stack Breakdown

| Layer | Technology | Primary Functionality |
|---|---|---|
| **Frontend Framework** | **React 18 + TypeScript** | Component-driven reactive UI architecture with strict static typing. |
| **Bundler & Dev Server** | **Vite** | Ultra-fast Hot Module Replacement (HMR) and optimized build bundling. |
| **Styling & Design System** | **Tailwind CSS + shadcn/ui** | Astronomy-inspired dark theme palette (`#0B0F19`, `#1E293B`, `#F59E0B`). |
| **3D Rendering Engine** | **Three.js & WebGL 2.0** | 3D scene graph, camera attitude transformation, shader materials, and 60 FPS render loop. |
| **Client Astronomy** | **Astronomy Engine (JS)** | Fast, zero-dependency in-browser VSOP87 ephemeris for instant 60 FPS rendering. |
| **Hardware Browser APIs** | **MediaDevices, DeviceOrientation, Geolocation** | Live camera video passthrough, orientation Euler angles, and GPS coordinate retrieval. |
| **Backend Framework** | **Python 3.11 + FastAPI** | High-performance asynchronous REST API with automatic OpenAPI documentation. |
| **Scientific Astronomy** | **Skyfield (NASA JPL DE421)** | Authoritative ephemeris verification engine calculating topocentric refraction-corrected vectors. |
| **Computer Vision Engine**| **OpenCV (Python headless) + NumPy** | Image decoding, thresholding, morphological filtering, contour analysis, and moments. |
| **Data Validation** | **Pydantic v2** | Strict input/output schema validation for geographic coordinates, timestamps, and vision results. |

---

## 🏗️ System Architecture & Workflow

```
[User Browser Client]
  ├── Geolocation API ────────► Geographic Coordinates (Lat, Lon, Elevation)
  ├── DeviceOrientation API ──► Attitude Euler Angles (Alpha, Beta, Gamma)
  ├── MediaDevices API ───────► Live Camera Stream (Video Background)
  ├── astronomy-engine (JS) ──► Instant Topocentric Azimuth & Altitude (60 FPS)
  │
  └── Three.js / WebGL 2.0 Canvas
        ├── ENU World Coordinate Transform (East-North-Up)
        ├── Attitude Quaternion Rotation (Device Pose)
        ├── Perspective Projection Matrix (Camera Pinhole Model)
        └── Output: Synthetic Sun Marker & Diurnal Arc over Live Camera Feed
  │
  ▼ [HTTP Requests (Asynchronous / Batch / Verification)]
[FastAPI Python Backend]
  ├── /api/solar/position ──► Skyfield (NASA JPL DE421) High-Precision Benchmark
  ├── /api/solar/path ──────► Dense 24-Hour Diurnal Path Batch Waypoints
  └── /api/vision/process ──► OpenCV BGR -> Grayscale -> Threshold -> Moments Centroid
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js:** $\ge 18.0.0$ (with `npm`)
- **Python:** $\ge 3.10.0$ (Python 3.11 recommended)
- **Modern Web Browser:** Chrome $\ge 110$, Edge $\ge 110$, Safari $\ge 16$, or Firefox $\ge 115$ with WebGL 2.0 support.

---

### 1. Backend Setup (FastAPI + Skyfield + OpenCV)

1. Open your terminal in the project root:
   ```bash
   cd backend
   ```
2. Create and activate a Python virtual environment:
   ```bash
   # Windows (PowerShell)
   python -m venv .venv
   .venv\Scripts\Activate.ps1

   # Linux / macOS
   python3 -m venv .venv
   source .venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Start the FastAPI development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
5. Test the backend:
   - Health check: [http://localhost:8000/api/health](http://localhost:8000/api/health)
   - Interactive API Docs (Swagger UI): [http://localhost:8000/docs](http://localhost:8000/docs)

---

### 2. Frontend Setup (React + Vite + TypeScript)

1. In a separate terminal window, navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install npm packages:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to:
   ```
   http://localhost:5173
   ```

*Note: For testing AR camera and device orientation sensors on a physical mobile device, run Vite with `--host` (`npm run dev -- --host`) and connect to your computer's local IP address over HTTPS.*

---

## ⚠️ Critical Safety Warning

> [!CAUTION]
> **NEVER LOOK DIRECTLY AT THE PHYSICAL SUN:**
> Looking directly at the Sun through an unshielded smartphone camera, optical viewfinder, telescope, or binoculars can cause **permanent retinal damage (solar retinopathy)** and permanently burn the device's CMOS digital image sensor. Always use certified ISO 12312-2 solar filters for direct solar observation.

---

## 📚 Technical Documentation & Research Artifacts

For in-depth mathematical derivations, literature citations, and detailed implementation phases, consult the dedicated project documentation files:
- [PROJECT_RESEARCH.md](file:///c:/Users/vansh/OneDrive/Desktop/CG&IP/PROJECT_RESEARCH.md) — Complete 26-section research specification, spherical trigonometry derivations, camera projection equations, and experimental methodology.
- [RESEARCH_SOURCES.md](file:///c:/Users/vansh/OneDrive/Desktop/CG&IP/RESEARCH_SOURCES.md) — Verified bibliographic register of peer-reviewed papers (with DOIs) and official technical documentation.
- [IMPLEMENTATION_ROADMAP.md](file:///c:/Users/vansh/OneDrive/Desktop/CG&IP/IMPLEMENTATION_ROADMAP.md) — 8-phase engineering roadmap with dependencies, deliverables, and acceptance criteria.
- [backend/README.md](file:///c:/Users/vansh/OneDrive/Desktop/CG&IP/backend/README.md) — Backend architecture, API schemas, and OpenCV microservice documentation.
- [frontend/README.md](file:///c:/Users/vansh/OneDrive/Desktop/CG&IP/frontend/README.md) — Frontend architecture, Three.js WebGL rendering pipeline, and sensor fusion guide.

---

## 📄 License & Academic Attribution
Developed as an academic research and laboratory project for university-level Computer Graphics & Image Processing (CGIP) curricula. Released under the MIT License.
