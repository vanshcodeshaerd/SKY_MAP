"""Tests for OpenCV image-processing service and vision endpoint."""

import cv2
from fastapi.testclient import TestClient
import numpy as np
import pytest

from app.main import app
from app.services.image_processor import process_solar_image

client = TestClient(app)


def create_synthetic_sun_image(
    width: int = 400,
    height: int = 300,
    cx: int = 200,
    cy: int = 120,
    radius: int = 25,
) -> bytes:
    """Create a dark image with a bright circular disc representing the Sun."""
    img = np.zeros((height, width, 3), dtype=np.uint8)
    # Draw white circle (BGR: 255, 255, 255)
    cv2.circle(img, (cx, cy), radius, (255, 255, 255), -1)
    success, encoded = cv2.imencode(".png", img)
    assert success
    return encoded.tobytes()


def test_process_solar_image_accuracy():
    """Verify that calculated centroid matches the synthetic Sun center within 0.5 px."""
    expected_x = 180
    expected_y = 110
    image_bytes = create_synthetic_sun_image(cx=expected_x, cy=expected_y, radius=20)
    
    result = process_solar_image(image_bytes, threshold_val=200)
    assert result["candidates_count"] >= 1
    primary = result["primary_candidate"]
    assert primary is not None
    
    detected_x, detected_y = primary["centroid_px"]
    assert pytest.approx(detected_x, abs=0.5) == expected_x
    assert pytest.approx(detected_y, abs=0.5) == expected_y
    assert primary["circularity"] > 0.85  # Clean circle


def test_process_dark_image():
    """Verify that an image with no bright spots returns 0 candidates gracefully."""
    dark_img = np.zeros((200, 200, 3), dtype=np.uint8)
    _, encoded = cv2.imencode(".png", dark_img)
    result = process_solar_image(encoded.tobytes(), threshold_val=220)
    assert result["candidates_count"] == 0
    assert result["primary_candidate"] is None


def test_vision_endpoint_upload():
    """Test POST /api/vision/process with synthetic image upload."""
    image_bytes = create_synthetic_sun_image(cx=150, cy=100)
    response = client.post(
        "/api/vision/process?threshold=200",
        files={"file": ("test_sky.png", image_bytes, "image/png")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["filename"] == "test_sky.png"
    assert data["candidates_count"] >= 1
    assert data["primary_candidate"] is not None
