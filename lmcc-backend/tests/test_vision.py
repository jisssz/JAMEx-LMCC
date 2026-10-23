import base64
import os
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

# 1x1 transparent PNG in base64
VALID_SAMPLE_BASE64 = (
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
)


def test_vision_extraction_mock_provider_success():
    payload = {
        "image_base64": VALID_SAMPLE_BASE64,
        "ocr_text_context": "BESTBITE WHEAT CRACKERS MRP: Rs. 40.00 Net Qty: 100g PKD: 05/2026 Mfg by BestBite Foods Ltd Customer care: 1800102030",
        "low_confidence_fields": ["mrp", "date_declaration"],
    }
    response = client.post("/api/extract/vision", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["provider_used"] == "mock"
    assert data["is_ai_fallback"] is True
    assert "disclaimer" in data

    # Check extracted fields
    assert "40.00" in (data["mrp"]["value"] or "")
    assert "100" in (data["net_quantity"]["value"] or "")
    assert "BestBite" in (data["manufacturer"]["value"] or "")
    assert data["mrp"]["status"] == "detected"
    assert data["net_quantity"]["status"] == "detected"


def test_vision_extraction_invalid_base64_error():
    payload = {
        "image_base64": "not_valid_base64_content!!!",
    }
    response = client.post("/api/extract/vision", json=payload)
    assert response.status_code == 400
    assert "Invalid base64" in response.json()["detail"]


def test_vision_extraction_oversized_payload_error():
    oversized = "a" * (9 * 1024 * 1024)
    payload = {
        "image_base64": oversized,
    }
    response = client.post("/api/extract/vision", json=payload)
    assert response.status_code == 413
    assert "exceeds" in response.json()["detail"]


def test_vision_extraction_missing_gemini_key_returns_503():
    with patch.dict(os.environ, {"VISION_PROVIDER": "gemini"}, clear=False):
        # Remove GEMINI_API_KEY from env
        if "GEMINI_API_KEY" in os.environ:
            del os.environ["GEMINI_API_KEY"]

        payload = {
            "image_base64": VALID_SAMPLE_BASE64,
        }
        response = client.post("/api/extract/vision", json=payload)
        assert response.status_code == 503
        assert "GEMINI_API_KEY is not configured" in response.json()["detail"]
