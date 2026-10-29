"""Computer Vision Lab image processing endpoint."""

from fastapi import APIRouter, File, HTTPException, Query, UploadFile, status

from app.core.config import settings
from app.schemas.vision import ImageDimensions, VisionCandidate, VisionProcessResponse
from app.services.image_processor import process_solar_image

router = APIRouter(prefix="/vision", tags=["Computer Vision"])


@router.post("/process", response_model=VisionProcessResponse)
async def process_image(
    file: UploadFile = File(..., description="Uploaded sky image (JPEG or PNG)"),
    threshold: int = Query(
        240,
        ge=50,
        le=255,
        description="Grayscale brightness threshold (0-255)",
    ),
) -> VisionProcessResponse:
    """Analyze sky image with OpenCV to extract brightest connected solar centroids."""
    if file.content_type not in settings.allowed_image_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported image type '{file.content_type}'. Allowed types: {list(settings.allowed_image_types)}",
        )

    image_bytes = await file.read()
    if len(image_bytes) > settings.max_upload_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Image file exceeds maximum limit of {settings.max_upload_bytes // (1024*1024)}MB",
        )

    try:
        processed = process_solar_image(image_bytes, threshold_val=threshold)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to process image buffer: {str(exc)}",
        )

    return VisionProcessResponse(
        filename=file.filename or "unknown.jpg",
        dimensions=ImageDimensions(**processed["dimensions"]),
        processing_time_ms=processed["processing_time_ms"],
        candidates_count=processed["candidates_count"],
        primary_candidate=(
            VisionCandidate(**processed["primary_candidate"])
            if processed["primary_candidate"]
            else None
        ),
        all_candidates=[
            VisionCandidate(**c) for c in processed["all_candidates"]
        ],
    )
