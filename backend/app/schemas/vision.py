"""Vision-lab detection models."""

from typing import List, Optional, Tuple

from pydantic import BaseModel, Field


class ImageDimensions(BaseModel):
    width: int
    height: int


class VisionCandidate(BaseModel):
    centroid_px: Tuple[float, float]
    area_px: float
    circularity: float


class VisionProcessResponse(BaseModel):
    filename: str
    dimensions: ImageDimensions
    processing_time_ms: float
    candidates_count: int
    primary_candidate: Optional[VisionCandidate] = None
    all_candidates: List[VisionCandidate] = Field(default_factory=list)
