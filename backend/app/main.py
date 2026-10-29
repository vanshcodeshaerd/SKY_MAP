"""SkyGazer AR FastAPI Application Factory."""

import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.api.router import api_router
from app.core.config import settings

app = FastAPI(
    title=settings.project_name,
    version=settings.version,
    description="SkyGazer AR Ephemeris & Computer Vision Microservice for solar tracking and augmented reality.",
    docs_url="/docs",
    redoc_url="/redoc",
)

# Enable CORS for browser frontend (supports localhost and local network mobile IPs)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permits mobile testing on LAN
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


# Resolve production static files directory (built React frontend)
_BACKEND_ROOT = Path(__file__).resolve().parents[1]
STATIC_DIR = Path(os.getenv("FRONTEND_DIST_DIR", _BACKEND_ROOT / "static"))

if STATIC_DIR.exists() and (STATIC_DIR / "index.html").exists():
    if (STATIC_DIR / "assets").exists():
        app.mount("/assets", StaticFiles(directory=str(STATIC_DIR / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        candidate = STATIC_DIR / full_path
        if full_path and candidate.exists() and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(STATIC_DIR / "index.html")
else:
    @app.get("/")
    def root():
        return {
            "project": settings.project_name,
            "version": settings.version,
            "docs": "/docs",
            "health": "/api/health",
        }
