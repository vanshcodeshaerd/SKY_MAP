"""Astronomical Catalog, Constellation, Planet, Sky & User Preferences Endpoints."""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.services import sky_catalog as svc

router = APIRouter(tags=["astronomy"])


class ObservationCreate(BaseModel):
    user_id: str = Field(default="default")
    celestial_object_id: str
    observed_at: Optional[str] = None
    latitude: float
    longitude: float


class UserPreferencesUpdate(BaseModel):
    display_mode: Optional[str] = None
    magnitude_limit: Optional[float] = None
    night_mode: Optional[bool] = None
    preferred_sky_culture: Optional[str] = None


@router.get("/stars")
def list_stars(
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    q: Optional[str] = None,
    constellation: Optional[str] = None,
):
    return svc.get_stars(limit=limit, offset=offset, q=q, constellation=constellation)


@router.get("/stars/{star_id}")
def get_star(star_id: str):
    star = svc.get_star_by_id(star_id)
    if not star:
        raise HTTPException(status_code=404, detail="Star not found")
    return star


@router.get("/constellations")
def list_constellations():
    items = svc.get_constellations()
    return {"total": len(items), "items": items}


@router.get("/constellations/nearby")
def nearby_constellations(
    ra: float = Query(..., ge=0, le=360),
    dec: float = Query(..., ge=-90, le=90),
    limit: int = Query(default=5, ge=1, le=20),
):
    stars = svc.get_stars(limit=500)["items"]
    seen: dict[str, float] = {}
    for s in stars:
        cid = s.get("constellationId")
        if not cid:
            continue
        sep = svc.angular_sep_deg(ra, dec, s["ra"], s["dec"])
        if cid not in seen or sep < seen[cid]:
            seen[cid] = sep
    ranked = sorted(seen.items(), key=lambda x: x[1])[:limit]
    return {"items": [{"constellationId": k, "angularDistanceDeg": round(v, 2)} for k, v in ranked]}


@router.get("/constellations/{con_id}")
def get_constellation(con_id: str):
    con = svc.get_constellation_by_id(con_id)
    if not con:
        raise HTTPException(status_code=404, detail="Constellation not found")
    return con


@router.get("/constellations/{con_id}/stars")
def get_constellation_stars(con_id: str):
    con = svc.get_constellation_by_id(con_id)
    if not con:
        raise HTTPException(status_code=404, detail="Constellation not found")
    return svc.get_constellation_stars(con["id"])


@router.get("/planets")
def list_planets(
    lat: float = Query(default=23.0225, ge=-90, le=90),
    lon: float = Query(default=72.5714, ge=-180, le=180),
):
    return {"items": svc.get_planets_positions(lat, lon, datetime.now(timezone.utc))}


@router.get("/planets/{planet_id}")
def get_planet(
    planet_id: str,
    lat: float = Query(default=23.0225, ge=-90, le=90),
    lon: float = Query(default=72.5714, ge=-180, le=180),
):
    items = svc.get_planets_positions(lat, lon, datetime.now(timezone.utc))
    for p in items:
        if p["id"].lower() == planet_id.lower():
            return p
    raise HTTPException(status_code=404, detail="Planet not found")


@router.get("/sky/visible")
def sky_visible(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    mag_limit: float = Query(default=3.5),
):
    dt = datetime.now(timezone.utc)
    planets = [p for p in svc.get_planets_positions(lat, lon, dt) if p["visible"]]
    stars = [s for s in svc.get_stars(limit=500)["items"] if s["magnitude"] <= mag_limit]
    visible_stars = []
    for s in stars:
        alt, az = svc.ra_dec_to_alt_az(s["ra"], s["dec"], lat, lon, dt)
        if alt > 0:
            visible_stars.append({**s, "altitude": round(alt, 2), "azimuth": round(az, 2)})
    return {"planets": planets, "stars": visible_stars[:100]}


@router.get("/sky/positions")
def sky_positions(lat: float = Query(..., ge=-90, le=90), lon: float = Query(..., ge=-180, le=180)):
    dt = datetime.now(timezone.utc)
    return {"timestamp": dt.isoformat(), "planets": svc.get_planets_positions(lat, lon, dt)}


@router.get("/sky/next-constellation")
def sky_next_constellation(
    ra: float = Query(..., ge=0, le=360),
    dec: float = Query(..., ge=-90, le=90),
    current_id: Optional[str] = None,
):
    nearby = nearby_constellations(ra=ra, dec=dec, limit=6)["items"]
    filtered = [c for c in nearby if not current_id or c["constellationId"].lower() != current_id.lower()]
    return {"next": filtered[:3]}


@router.get("/sky/visibility")
def sky_visibility(
    ra: float = Query(..., ge=0, le=360),
    dec: float = Query(..., ge=-90, le=90),
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
):
    alt, az = svc.ra_dec_to_alt_az(ra, dec, lat, lon, datetime.now(timezone.utc))
    return {"altitude": round(alt, 2), "azimuth": round(az, 2), "visible": alt > 0}


@router.get("/astronomy/events")
def astronomy_events():
    return {
        "items": [
            {"name": "Perseids Meteor Shower", "peakMonth": "August", "zhr": 100},
            {"name": "Geminids Meteor Shower", "peakMonth": "December", "zhr": 120},
            {"name": "Quadrantids Meteor Shower", "peakMonth": "January", "zhr": 80},
        ]
    }


@router.post("/observations")
def create_observation(payload: ObservationCreate):
    return svc.add_observation(payload.model_dump())


@router.get("/user/preferences")
def read_preferences(user_id: str = Query(default="default")):
    return svc.get_preferences(user_id)


@router.put("/user/preferences")
def update_preferences(payload: UserPreferencesUpdate, user_id: str = Query(default="default")):
    return svc.put_preferences(user_id, payload.model_dump(exclude_none=True))
