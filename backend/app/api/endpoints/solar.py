"""Solar position and diurnal path endpoints."""

from datetime import date, datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status

from app.schemas.solar import (
    BatchPositionItem,
    SolarPathResponse,
    SolarPositionResponse,
    SolarPositionsBatchResponse,
    format_utc_z,
)
from app.services.solar_calculator import (
    DE421_TARGET_MAP,
    calculate_diurnal_path,
    calculate_solar_position,
    calculate_solar_positions_batch,
)

router = APIRouter(prefix="/solar", tags=["Solar Ephemeris"])

_VALID_BODIES = frozenset(DE421_TARGET_MAP.keys())


@router.get("/position", response_model=SolarPositionResponse)
def get_solar_position(
    latitude: float = Query(
        ...,
        ge=-90.0,
        le=90.0,
        description="Observer geographic latitude in decimal degrees (-90 to +90)",
    ),
    longitude: float = Query(
        ...,
        ge=-180.0,
        le=180.0,
        description="Observer geographic longitude in decimal degrees (-180 to +180)",
    ),
    elevation_m: float = Query(
        0.0,
        ge=-500.0,
        le=9000.0,
        description="Observer elevation above sea level in meters",
    ),
    timestamp: Optional[str] = Query(
        None,
        description="ISO-8601 formatted UTC timestamp (defaults to current time)",
    ),
    body: str = Query(
        "sun",
        description="Celestial body name: sun, moon, mercury, venus, mars, jupiter, saturn, uranus, neptune",
    ),
) -> SolarPositionResponse:
    """Calculate instantaneous topocentric apparent solar or planetary coordinates."""
    if timestamp:
        try:
            # Handle trailing Z
            iso_str = timestamp.replace("Z", "+00:00") if timestamp.endswith("Z") else timestamp
            dt_utc = datetime.fromisoformat(iso_str)
            if dt_utc.tzinfo is None:
                dt_utc = dt_utc.replace(tzinfo=timezone.utc)
            else:
                dt_utc = dt_utc.astimezone(timezone.utc)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid ISO-8601 timestamp string",
            )
    else:
        dt_utc = datetime.now(timezone.utc)

    body_key = body.lower().strip()
    if body_key not in _VALID_BODIES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid body '{body}'. Allowed: {sorted(_VALID_BODIES)}",
        )

    result = calculate_solar_position(
        lat=latitude,
        lon=longitude,
        elevation_m=elevation_m,
        dt_utc=dt_utc,
        body=body_key,
    )
    return SolarPositionResponse(**result)


@router.get("/positions/batch", response_model=SolarPositionsBatchResponse)
def get_solar_positions_batch(
    latitude: float = Query(..., ge=-90.0, le=90.0),
    longitude: float = Query(..., ge=-180.0, le=180.0),
    elevation_m: float = Query(0.0, ge=-500.0, le=9000.0),
    timestamp: Optional[str] = Query(None, description="ISO-8601 UTC"),
    bodies: Optional[str] = Query(
        None,
        description="Comma-separated body keys (default: all planets + sun/moon)",
    ),
) -> SolarPositionsBatchResponse:
    if timestamp:
        try:
            iso_str = timestamp.replace("Z", "+00:00") if timestamp.endswith("Z") else timestamp
            dt_utc = datetime.fromisoformat(iso_str)
            if dt_utc.tzinfo is None:
                dt_utc = dt_utc.replace(tzinfo=timezone.utc)
            else:
                dt_utc = dt_utc.astimezone(timezone.utc)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid ISO-8601 timestamp string",
            )
    else:
        dt_utc = datetime.now(timezone.utc)

    body_list = None
    if bodies:
        body_list = [b.strip().lower() for b in bodies.split(",") if b.strip()]
        invalid = [b for b in body_list if b not in _VALID_BODIES]
        if invalid:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid bodies: {invalid}",
            )

    raw = calculate_solar_positions_batch(
        latitude, longitude, elevation_m, dt_utc, bodies=body_list
    )
    positions = {k: BatchPositionItem(**v) for k, v in raw.items()}
    ts = format_utc_z(dt_utc)
    return SolarPositionsBatchResponse(
        latitude=latitude,
        longitude=longitude,
        elevation_m=elevation_m,
        timestamp_utc=ts,
        positions=positions,
    )


@router.get("/path", response_model=SolarPathResponse)
def get_solar_path(
    latitude: float = Query(
        ...,
        ge=-90.0,
        le=90.0,
        description="Observer latitude (-90 to +90)",
    ),
    longitude: float = Query(
        ...,
        ge=-180.0,
        le=180.0,
        description="Observer longitude (-180 to +180)",
    ),
    elevation_m: float = Query(
        0.0,
        ge=-500.0,
        le=9000.0,
        description="Observer elevation in meters",
    ),
    date_str: str = Query(
        ...,
        alias="date",
        pattern=r"^\d{4}-\d{2}-\d{2}$",
        description="Target calendar date in YYYY-MM-DD format",
    ),
    step_minutes: int = Query(
        15,
        ge=5,
        le=60,
        description="Time sampling step in minutes",
    ),
) -> SolarPathResponse:
    """Compute 24-hour diurnal solar trajectory waypoints and solar events."""
    try:
        target_date = date.fromisoformat(date_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid date format. Expected YYYY-MM-DD",
        )

    result = calculate_diurnal_path(
        lat=latitude,
        lon=longitude,
        elevation_m=elevation_m,
        day=target_date,
        step_minutes=step_minutes,
    )
    return SolarPathResponse(**result)
