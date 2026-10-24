import asyncio
import os
from types import SimpleNamespace
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app
from app.schemas.vision import VisionExtractionRequest

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
    with patch.dict(os.environ, {"VISION_PROVIDER": "mock"}, clear=False):
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


def test_vision_extraction_rejects_mislabeled_image_bytes():
    payload = {"image_base64": "data:image/jpeg;base64," + VALID_SAMPLE_BASE64.split(",", 1)[1]}
    response = client.post("/api/extract/vision", json=payload)
    assert response.status_code == 400
    assert "matching its MIME type" in response.json()["detail"]


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
        assert "configure GEMINI_API_KEY" in response.json()["detail"]


def test_vision_extraction_does_not_silently_use_mock_without_provider(monkeypatch):
    monkeypatch.setenv("VISION_PROVIDER", "")
    monkeypatch.setenv("GEMINI_API_KEY", "")
    response = client.post("/api/extract/vision", json={"image_base64": VALID_SAMPLE_BASE64})
    assert response.status_code == 503
    assert "configure GEMINI_API_KEY" in response.json()["detail"]


def test_mock_vision_output_is_disabled_in_production(monkeypatch):
    monkeypatch.setenv("VISION_PROVIDER", "mock")
    monkeypatch.setenv("VERCEL_ENV", "production")
    response = client.post("/api/extract/vision", json={"image_base64": VALID_SAMPLE_BASE64})
    assert response.status_code == 503
    assert "disabled in production" in response.json()["detail"]


def test_gemini_vision_uses_multimodal_model_and_matching_image_mime(monkeypatch):
    from app.services.vision.provider import GeminiVisionProvider

    captured = {}

    class StubClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args):
            return False

        async def post(self, url, json, headers=None):
            captured.update(url=url, body=json, headers=headers)
            return SimpleNamespace(
                status_code=200,
                json=lambda: {"candidates": [{"content": {"parts": [{"text": '{"mrp":{"value":"₹40","confidence":0.9,"status":"detected","evidence":"MRP 40"}}'}]}}]},
            )

    monkeypatch.setattr("app.services.vision.provider.httpx.AsyncClient", lambda **_kwargs: StubClient())
    provider = GeminiVisionProvider("test-key")
    result = asyncio.run(provider.extract_declarations(VisionExtractionRequest(
        image_base64=VALID_SAMPLE_BASE64,
        ocr_text_context="MRP 40",
    )))
    assert captured["url"].endswith("models/gemini-3.5-flash-lite:generateContent")
    assert captured["headers"]["x-goog-api-key"] == "test-key"
    assert "test-key" not in captured["url"]
    assert captured["body"]["generationConfig"]["responseMimeType"] == "application/json"
    assert captured["body"]["contents"][0]["parts"][1]["inline_data"]["mime_type"] == "image/png"
    assert "Untrusted OCR context" in captured["body"]["contents"][0]["parts"][0]["text"]
    assert result.provider_used == "gemini-3.5-flash-lite"
    assert result.mrp.value == "₹40"
