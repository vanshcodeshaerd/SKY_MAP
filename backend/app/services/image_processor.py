"""OpenCV image-processing pipeline for solar candidate extraction."""

import time
from typing import Any, Dict, List

import cv2
import numpy as np


def process_solar_image(image_bytes: bytes, threshold_val: int = 240) -> Dict[str, Any]:
    """
    Decodes an image buffer, applies Gaussian smoothing, intensity thresholding,
    morphological opening/closing, and extracts connected contour centroids via spatial moments.
    """
    start_time = time.perf_counter()

    # Decode image buffer into OpenCV BGR matrix
    nparr = np.frombuffer(image_bytes, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if frame is None:
        raise ValueError("Invalid image file format or corrupted buffer")

    height, width, _ = frame.shape

    # 1. Convert to Grayscale
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    # 2. Gaussian Blur to attenuate high-frequency sensor noise
    blurred = cv2.GaussianBlur(gray, (9, 9), 2.0)

    # 3. Binary Thresholding
    _, thresh = cv2.threshold(blurred, threshold_val, 255, cv2.THRESH_BINARY)

    # 4. Morphological Opening (remove salt noise) and Closing (bridge glare gaps)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    opened = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel)
    cleaned = cv2.morphologyEx(opened, cv2.MORPH_CLOSE, kernel)

    # 5. Extract Contours
    contours, _ = cv2.findContours(cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    candidates: List[Dict[str, Any]] = []

    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < 16.0:  # Ignore trivial speckles
            continue

        M = cv2.moments(cnt)
        if M["m00"] != 0:
            cX = float(M["m10"] / M["m00"])
            cY = float(M["m01"] / M["m00"])

            # Compute perimeter and isoperimetric circularity metric: 4*pi*Area / (Perimeter^2)
            perimeter = cv2.arcLength(cnt, True)
            circularity = (
                float(4.0 * np.pi * (area / (perimeter * perimeter)))
                if perimeter > 0
                else 0.0
            )

            candidates.append(
                {
                    "centroid_px": (round(cX, 2), round(cY, 2)),
                    "area_px": round(float(area), 2),
                    "circularity": round(min(circularity, 1.0), 3),
                }
            )

    # Sort candidates by area descending (largest brightest region first)
    candidates.sort(key=lambda c: c["area_px"], reverse=True)

    elapsed_ms = (time.perf_counter() - start_time) * 1000.0

    return {
        "dimensions": {"width": width, "height": height},
        "processing_time_ms": round(elapsed_ms, 2),
        "candidates_count": len(candidates),
        "primary_candidate": candidates[0] if candidates else None,
        "all_candidates": candidates,
    }
