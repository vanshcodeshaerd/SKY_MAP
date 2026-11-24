# ==========================================
# Stage 1: Build Frontend (React + Vite + TypeScript)
# ==========================================
FROM node:20-alpine AS frontend-builder
WORKDIR /build

# Copy dependency manifests first for cached Docker layers
COPY frontend/package*.json ./
RUN npm ci

# Copy frontend source files and compile production bundle
COPY frontend/ ./
RUN npm run build

# ==========================================
# Stage 2: Unified Production Runtime (FastAPI + SPA)
# ==========================================
FROM python:3.11-slim AS production

# Install curl for container healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python backend dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy NASA JPL DE421 ephemeris file (if present locally, otherwise downloaded on first run)
COPY backend/de421.bsp* ./

# Copy FastAPI backend application code
COPY backend/app ./app

# Copy compiled frontend SPA assets from Stage 1 into static directory
COPY --from=frontend-builder /build/dist ./static

# Set production environment variables
ENV HOST=0.0.0.0
ENV PORT=8000
ENV PYTHONUNBUFFERED=1

EXPOSE 8000

# Container healthcheck ensuring API and ephemeris engine are online
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/api/health || exit 1

# Start Uvicorn serving both REST API and React Single Page Application
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
