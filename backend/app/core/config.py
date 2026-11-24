"""Application metadata and CORS settings."""

import os
from typing import List, Optional


def _split_csv(value: str) -> List[str]:
    return [x.strip() for x in value.split(",") if x.strip()]


class Settings:
    project_name: str = "SkyGazer AR"
    version: str = "1.0.0"
    ephemeris_engine: str = "Skyfield (NASA JPL DE421)"
    cors_origins: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        *_split_csv(os.getenv("CORS_ORIGINS", "")),
    ]
    cors_origin_regex: Optional[str] = os.getenv(
        "CORS_ORIGIN_REGEX",
        r"https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?|https://.*\.vercel\.app",
    )
    cors_allow_credentials: bool = os.getenv("CORS_ALLOW_CREDENTIALS", "false").lower() in (
        "1",
        "true",
        "yes",
    )
    max_upload_bytes: int = 10 * 1024 * 1024
    allowed_image_types: frozenset[str] = frozenset(
        {"image/jpeg", "image/jpg", "image/png"}
    )
    refraction_pressure_mbar: float = 1013.25
    refraction_temperature_c: float = 15.0
    sunrise_altitude_deg: float = -0.8333


settings = Settings()
