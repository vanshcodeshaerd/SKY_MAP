"""Central API Router for SkyGazer AR."""

from fastapi import APIRouter

from app.api.endpoints.health import router as health_router
from app.api.endpoints.solar import router as solar_router
from app.api.endpoints.vision import router as vision_router

api_router = APIRouter(prefix="/api")
api_router.include_router(health_router)
api_router.include_router(solar_router)
api_router.include_router(vision_router)
