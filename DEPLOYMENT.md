# SkyGazer AR — Production Deployment Guide 🚀☀️

SkyGazer AR is packaged as a **Unified Production Docker Container**, where the high-performance Python FastAPI backend serves both:
1. **The REST API endpoints (`/api/*`)** powered by Skyfield and NASA JPL DE421 ephemeris.
2. **The React 18 + Vite + Three.js Single Page Application (SPA)** statically at the root (`/`).

This architecture completely eliminates CORS issues, requires only a single port, and runs identically across any cloud host or container service.

---

## 📦 Container Specifications

- **Container Image**: Multi-stage build (`node:20-alpine` -> `python:3.11-slim`)
- **Default Port**: Dynamically detects `$PORT` (defaults to `8000`)
- **Healthcheck**: `GET /api/health`
- **Astronomical Ephemeris**: NASA JPL DE421 (`de421.bsp`, ~16 MB) bundled in the image

---

## 🛠️ Option 1: Local & VPS Deployment (Docker / Docker Compose)

### A. Run with Docker Compose
```bash
# Build and run the unified container in the background
docker compose up --build -d

# Check running status
docker compose ps

# View live container logs
docker compose logs -f
```
Open **[http://localhost:8000](http://localhost:8000)** in your browser.

### B. Run with Plain Docker
```bash
# Build the image
docker build -t skygazer-ar:latest .

# Run the container
docker run -d --name skygazer-app -p 8000:8000 skygazer-ar:latest

# Verify health endpoint
curl http://localhost:8000/api/health
```

---

## ☁️ Option 2: 1-Click Free/Low-Cost Cloud Platforms

### 1. Render.com (Recommended for Fast Deployment)
1. Push your repository to GitHub.
2. Log into [Render Dashboard](https://dashboard.render.com/) and click **New +** -> **Web Service**.
3. Select your GitHub repository.
4. Set the following configuration:
   - **Environment**: `Docker`
   - **Dockerfile Path**: `./Dockerfile`
   - **Instance Type**: Free or Starter (512 MB+ RAM recommended)
5. Click **Create Web Service**.
6. Render will automatically build the image, detect the `$PORT`, and provide a free HTTPS URL (e.g. `https://skygazer-ar.onrender.com`).

### 2. Railway.app
1. Go to [Railway.app](https://railway.app/) and create a **New Project**.
2. Choose **Deploy from GitHub repo** and select your repository.
3. Railway automatically detects the root `Dockerfile` and builds both frontend and backend into a single service.
4. In **Settings** -> **Networking**, click **Generate Domain** to get your public HTTPS URL.

### 3. Fly.io
1. Install Flyctl CLI:
   ```bash
   # Windows (PowerShell)
   iwr https://fly.io/install.ps1 -useb | iex
   ```
2. Launch and deploy:
   ```bash
   fly launch --name skygazer-ar --internal-port 8000
   fly deploy
   ```

---

## 🏢 Option 3: AWS Cloud Deployment

### AWS App Runner (Serverless Container Platform)
AWS App Runner automatically builds and runs containerized web apps with automatic scaling, SSL certificates, and zero infrastructure management:

1. **Push Container to Amazon ECR (Elastic Container Registry)**:
   ```bash
   # Log in to ECR
   aws ecr get-login-password --region <your-region> | docker login --username AWS --password-stdin <aws_account_id>.dkr.ecr.<your-region>.amazonaws.com

   # Create repository
   aws ecr create-repository --repository-name skygazer-ar --region <your-region>

   # Tag and push
   docker tag skygazer-ar:latest <aws_account_id>.dkr.ecr.<your-region>.amazonaws.com/skygazer-ar:latest
   docker push <aws_account_id>.dkr.ecr.<your-region>.amazonaws.com/skygazer-ar:latest
   ```

2. **Deploy Service via AWS App Runner**:
   - In AWS Console -> **App Runner** -> **Create service**.
   - Source: **Container registry** -> Select the pushed ECR image.
   - Port: `8000`
   - CPU/Memory: `1 vCPU`, `2 GB Memory`
   - App Runner will deploy the container with an automatic `https://*.awsapprunner.com` SSL domain.

---

## 🔒 Mobile AR Camera & Geolocation Over HTTPS Note

Augmented Reality features (`navigator.mediaDevices.getUserMedia`) and Geolocation (`navigator.geolocation`) **strictly require HTTPS** in all modern mobile browsers (Safari on iOS and Chrome on Android):
- When deployed on Render, Railway, Fly.io, or AWS App Runner, **HTTPS is provided automatically with a valid SSL certificate**.
- Once deployed, you can open the public URL on your phone to test the live AR solar tracking camera and compass sensors!
