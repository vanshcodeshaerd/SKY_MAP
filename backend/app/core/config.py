"""Application metadata and CORS settings."""

from typing import List


class Settings:
    project_name: str = "SkyGazer AR"
    version: str = "1.0.0"
    ephemeris_engine: str = "Skyfield (NASA JPL DE421)"
    cors_origins: List[str] = ["http://localhost:5173"]
    max_upload_bytes: int = 10 * 1024 * 1024
    allowed_image_types: frozenset[str] = frozenset(
        {"image/jpeg", "image/jpg", "image/png"}
    )
    refraction_pressure_mbar: float = 1013.25
    refraction_temperature_c: float = 15.0
    sunrise_altitude_deg: float = -0.8333


settings = Settings()
