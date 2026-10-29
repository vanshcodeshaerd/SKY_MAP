"""Solar position and diurnal-path Pydantic v2 models."""

from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


def format_utc_z(dt: datetime) -> str:
    """Render a timezone-aware datetime as ISO-8601 UTC with a Z suffix."""
    from datetime import timezone

    aware = dt if dt.tzinfo is not None else dt.replace(tzinfo=timezone.utc)
    utc = aware.astimezone(timezone.utc).replace(microsecond=0)
    return utc.strftime("%Y-%m-%dT%H:%M:%SZ")


class SolarPositionResponse(BaseModel):
    model_config = ConfigDict(ser_json_timedelta="iso8601")

    latitude: float
    longitude: float
    elevation_m: float
    timestamp_utc: str
    azimuth_degrees: float
    altitude_degrees: float
    is_above_horizon: bool
    atmospheric_refraction_deg: float
    distance_au: float


class Observer(BaseModel):
    latitude: float
    longitude: float


class PathWaypoint(BaseModel):
    time_utc: str
    azimuth_degrees: float
    altitude_degrees: float
    vector_enu: List[float] = Field(min_length=3, max_length=3)
    is_visible: bool


class SolarEvents(BaseModel):
    sunrise_utc: Optional[str] = None
    solar_noon_utc: Optional[str] = None
    sunset_utc: Optional[str] = None


class SolarPathResponse(BaseModel):
    date: str
    observer: Observer
    waypoints_count: int
    waypoints: List[PathWaypoint]
    solar_events: SolarEvents


class HealthResponse(BaseModel):
    status: str
    version: str
    ephemeris_engine: str
    timestamp_utc: str


class DateQuery(BaseModel):
    """Validates YYYY-MM-DD path dates if parsed as a datetime.date."""

    value: date

    @field_validator("value")
    @classmethod
    def _must_be_date(cls, v: date) -> date:
        return v
