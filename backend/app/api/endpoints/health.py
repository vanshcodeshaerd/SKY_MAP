"""Health check endpoint."""

from datetime import datetime, timezone
from fastapi import APIRouter
from app.core.config import settings
from app.schemas.solar import HealthResponse, format_utc_z

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
def get_health() -> HealthResponse:
    now_utc = datetime.now(timezone.utc)
    return HealthResponse(
        status="online",
        version=settings.version,
        ephemeris_engine=settings.ephemeris_engine,
        timestamp_utc=format_utc_z(now_utc),
    )
