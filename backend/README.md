# SkyGazer AR — Backend Server

A high-performance Python 3.11 + FastAPI microservice providing authoritative astronomical ephemeris calculations, diurnal trajectory generation, and an OpenCV image-processing laboratory for the **SkyGazer AR** system.

---

## 🛠️ Tech Stack & Dependencies

- **FastAPI:** Modern asynchronous Web framework for building APIs with Python 3.10+.
- **Uvicorn:** Lightning-fast ASGI web server implementation.
- **Skyfield:** High-precision astronomy library by Brandon Rhodes powered by NASA JPL Ephemerides (DE421).
- **OpenCV (`opencv-python-headless`):** Computer vision and digital image processing engine.
- **NumPy:** Vectorized numerical computations and matrix transformations.
- **Pydantic v2:** Robust request/response schema modeling and runtime data validation.
- **Pytest & HTTPX:** Comprehensive automated testing suite.

---

## 📂 Architecture & Directory Structure

```
backend/
├── app/
│   ├── api/
│   │   ├── endpoints/
│   │   │   ├── health.py        # GET /api/health
│   │   │   ├── solar.py         # GET /api/solar/position, GET /api/solar/path
│   │   │   └── vision.py        # POST /api/vision/process (OpenCV)
│   │   └── router.py            # Central FastAPI APIRouter
│   ├── core/
│   │   ├── config.py            # CORS origins, project metadata
│   │   └── ephemeris.py         # NASA JPL DE421 ephemeris loader & caching
│   ├── schemas/                 # Pydantic v2 data models
│   │   ├── solar.py             # Coordinate request/response models
│   │   └── vision.py            # Image processing detection models
│   ├── services/                # Business & algorithmic logic
│   │   ├── solar_calculator.py  # Skyfield topocentric altitude & azimuth math
│   │   └── image_processor.py   # OpenCV thresholding, morphology & moments
│   └── main.py                  # FastAPI application entrypoint & middleware
├── tests/
│   ├── test_solar_math.py       # Ephemeris accuracy vs. reference SPA tables
│   ├── test_api_endpoints.py    # Health & solar endpoint integration tests
│   └── test_vision_pipeline.py  # OpenCV centroid extraction test cases
├── requirements.txt             # Locked Python dependencies
└── README.md                    # This document
```

---

## 🚀 Installation & Local Execution

### 1. Create and Activate Virtual Environment
```bash
# In the backend directory:
# Windows (PowerShell)
python -m venv .venv
.venv\Scripts\Activate.ps1

# Linux / macOS
python3 -m venv .venv
source .venv/bin/activate
```

### 2. Install Required Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

### 3. Run the Development Server
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Once running, access:
- **Interactive OpenAPI Documentation (Swagger UI):** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Alternative ReDoc UI:** [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **Health Check:** [http://localhost:8000/api/health](http://localhost:8000/api/health)

---

## 📡 API Endpoints Specification

### 1. `GET /api/health`
Returns system status, active version, and ephemeris engine confirmation.

### 2. `GET /api/solar/position`
Calculates instantaneous apparent topocentric solar coordinates for an observer.
- **Parameters:**
  - `latitude` (`float`, $-90.0 \le \phi \le 90.0$)
  - `longitude` (`float`, $-180.0 \le \lambda \le 180.0$)
  - `elevation_m` (`float`, default: $0.0$)
  - `timestamp` (`string` ISO 8601 UTC, optional; defaults to server time)
- **Returns:**
  - `azimuth_degrees`: Clockwise from True North ($0^\circ = \text{North}, 90^\circ = \text{East}$).
  - `altitude_degrees`: Elevation above horizon (with Bennett atmospheric refraction correction).
  - `distance_au`: Earth-Sun distance in Astronomical Units.
  - `is_above_horizon`: Boolean visibility indicator.

### 3. `GET /api/solar/path`
Batches 24-hour diurnal solar trajectory waypoints at user-defined step intervals (e.g. every 15 minutes).
- **Parameters:** `latitude`, `longitude`, `date` (`YYYY-MM-DD`), `step_minutes` (default: 15).
- **Returns:** Array of 96 waypoints with ENU direction vectors $[s_x, s_y, s_z]$ and sunrise/solar noon/sunset event times.

### 4. `POST /api/vision/process`
Ingests an uploaded sky image or camera snapshot (`multipart/form-data`) and executes the OpenCV analysis pipeline.
- **Parameters:**
  - `file`: `UploadFile` (image/jpeg, image/png)
  - `threshold`: Integer cutoff ($100 - 255$, default: 240)
- **Execution Pipeline:**
  1. Decodes image buffer to BGR array via `cv2.imdecode`.
  2. Converts to Grayscale and HSV color spaces.
  3. Applies $9\times 9$ Gaussian blur filter.
  4. Binarizes image using the intensity threshold.
  5. Cleans noise using morphological opening ($7\times 7$ elliptical structuring element).
  6. Extracts contours with `cv2.findContours`.
  7. Computes spatial moments ($m_{00}, m_{10}, m_{01}$) to determine centroid $(\bar{x}, \bar{y})$ and circularity metric.
- **Returns:** Image dimensions, processing time in milliseconds, candidate count, and primary centroid coordinates.

---

## 🧪 Testing Suite

Execute the automated test suite using pytest:
```bash
pytest -v tests/
```
Tests verify mathematical stability, parameter validation edge cases, and OpenCV moment computations.
