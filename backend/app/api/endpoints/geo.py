"""Geodesy helpers for client calibration."""

from fastapi import APIRouter, Query

from app.schemas.solar import MagneticDeclinationResponse
from app.services.magnetic_declination import magnetic_declination_deg

router = APIRouter(prefix="/geo", tags=["Geodesy"])


@router.get("/declination", response_model=MagneticDeclinationResponse)
def get_magnetic_declination(
    latitude: float = Query(..., ge=-90.0, le=90.0),
    longitude: float = Query(..., ge=-180.0, le=180.0),
) -> MagneticDeclinationResponse:
    dec = magnetic_declination_deg(latitude, longitude)
    return MagneticDeclinationResponse(
        latitude=latitude,
        longitude=longitude,
        declination_deg=dec,
        note="Approximate WMM dipole; use manual calibration for best AR lock.",
    )