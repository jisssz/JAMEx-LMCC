import os
import base64
import json
import re
from abc import ABC, abstractmethod
from typing import Optional
import httpx
from app.schemas.vision import (
    VisionExtractionRequest,
    VisionExtractionResponse,
    ExtractedFieldItem,
)


class VisionProviderUnavailableException(Exception):
    """Raised when an external Vision AI provider lacks API keys or connectivity."""
    pass


class VisionExtractionProvider(ABC):
    @abstractmethod
    async def extract_declarations(
        self, request: VisionExtractionRequest
    ) -> VisionExtractionResponse:
        """Extracts structured packaging declarations from the provided image and OCR context."""
        pass


class MockVisionProvider(VisionExtractionProvider):
    """
    Deterministic mock provider for automated tests, reproducible evaluation,
    and offline environments without incurring paid API charges.
    """

    async def extract_declarations(
        self, request: VisionExtractionRequest
    ) -> VisionExtractionResponse:
        ocr = request.ocr_text_context or ""

        # Deterministic extraction based on text context or mock packaging patterns
        mrp_val = None
        mrp_m = re.search(r"(?:MRP|₹|Rs\.?)\s*[:.]?\s*(\d+(?:\.\d{1,2})?)", ocr, re.IGNORECASE)
        if mrp_m:
            mrp_val = f"₹{mrp_m.group(1)} (Incl. of all taxes)"

        net_qty_val = None
        qty_m = re.search(r"(\d+(?:\.\d+)?)\s*(g|kg|ml|l|gm|grams)", ocr, re.IGNORECASE)
        if qty_m:
            net_qty_val = f"{qty_m.group(1)} {qty_m.group(2).lower()}"

        mfg_val = None
        mfg_m = re.search(r"(?:Mfg by|Manufactured by|Packed by)\s*[:.]?\s*([A-Za-z0-9\s.,&]+Ltd)", ocr, re.IGNORECASE)
        if mfg_m:
            mfg_val = mfg_m.group(1).strip()

        date_val = None
        date_m = re.search(r"(?:MFD|PKD|Date)\s*[:.]?\s*(\d{2}/\d{4}|\d{2}/\d{2}/\d{4})", ocr, re.IGNORECASE)
        if date_m:
            date_val = date_m.group(1)

        care_val = None
        care_m = re.search(r"(?:Customer care|Helpline|Toll free)\s*[:.]?\s*(\d{10}|\d{4}[-\s]\d{3}[-\s]\d{3,4})", ocr, re.IGNORECASE)
        if care_m:
            care_val = care_m.group(1)

        return VisionExtractionResponse(
            product_name=ExtractedFieldItem(
                value="Mock Packaging Sample",
                confidence=0.92,
                status="detected",
                evidence_snippet="Packaging Header",
            ),
            mrp=ExtractedFieldItem(
                value=mrp_val or "₹99.00 (Incl. of all taxes)",
                confidence=0.95 if mrp_val else 0.85,
                status="detected" if mrp_val else "uncertain",
                evidence_snippet="MRP stamp",
            ),
            net_quantity=ExtractedFieldItem(
                value=net_qty_val or "200 g",
                confidence=0.96 if net_qty_val else 0.80,
                status="detected" if net_qty_val else "uncertain",
                evidence_snippet="Net Qty stamp",
            ),
            manufacturer=ExtractedFieldItem(
                value=mfg_val or "Sample Foods India Ltd",
                confidence=0.90 if mfg_val else 0.75,
                status="detected" if mfg_val else "uncertain",
                evidence_snippet="Manufacturer line",
            ),
            date_declaration=ExtractedFieldItem(
                value=date_val or "09/2026",
                confidence=0.94 if date_val else 0.70,
                status="detected" if date_val else "uncertain",
                evidence_snippet="MFD date stamp",
            ),
            consumer_care=ExtractedFieldItem(
                value=care_val or "1800-123-4567",
                confidence=0.91 if care_val else 0.70,
                status="detected" if care_val else "uncertain",
                evidence_snippet="Helpline panel",
            ),
            provider_used="mock",
            is_ai_fallback=True,
            provenance="Deterministic Mock Vision Engine (Test & Evaluation)",
        )


class GeminiVisionProvider(VisionExtractionProvider):
    """
    Google Gemini 1.5 Flash multi-modal vision provider.
    Activated only when GEMINI_API_KEY environment variable is supplied.
    """

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.endpoint = (
            f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={self.api_key}"
        )

    async def extract_declarations(
        self, request: VisionExtractionRequest
    ) -> VisionExtractionResponse:
        # Prompt engineered specifically for Rule 6 of LMPC 2011
        prompt = (
            "Analyze this packaged commodity label image and extract mandatory declarations under Rule 6 of India's "
            "Legal Metrology (Packaged Commodities) Rules, 2011.\n"
            "Extract: product_name, mrp, net_quantity, manufacturer, date_declaration, consumer_care.\n"
            "Return valid JSON strictly matching the schema: "
            "{product_name: {value, confidence, status}, mrp: {value, confidence, status}, ...}"
        )

        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt},
                        {
                            "inline_data": {
                                "mime_type": "image/jpeg",
                                "data": request.image_base64.split(",")[-1],
                            }
                        },
                    ]
                }
            ],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.1,
            },
        }

        async with httpx.AsyncClient(timeout=25.0) as client:
            resp = await client.post(self.endpoint, json=payload)
            if resp.status_code != 200:
                raise VisionProviderUnavailableException(f"Gemini API error ({resp.status_code}): {resp.text}")

            result_json = resp.json()
            raw_text = result_json["candidates"][0]["content"]["parts"][0]["text"]
            parsed = json.loads(raw_text)

            def get_field(key: str) -> ExtractedFieldItem:
                val = parsed.get(key, {})
                if isinstance(val, dict):
                    return ExtractedFieldItem(
                        value=val.get("value"),
                        confidence=float(val.get("confidence", 0.8)),
                        status=val.get("status", "detected" if val.get("value") else "not_detected"),
                        evidence_snippet=val.get("evidence"),
                    )
                return ExtractedFieldItem(value=str(val) if val else None, confidence=0.8, status="detected")

            return VisionExtractionResponse(
                product_name=get_field("product_name"),
                mrp=get_field("mrp"),
                net_quantity=get_field("net_quantity"),
                manufacturer=get_field("manufacturer"),
                date_declaration=get_field("date_declaration"),
                consumer_care=get_field("consumer_care"),
                provider_used="gemini-1.5-flash",
                is_ai_fallback=True,
                provenance="Google Gemini 1.5 Flash Multi-Modal Vision",
            )


def get_vision_provider() -> VisionExtractionProvider:
    """Factory selecting the appropriate Vision AI provider based on configuration."""
    provider_type = (os.getenv("VISION_PROVIDER") or "").strip().lower()

    if provider_type == "gemini":
        gemini_key = os.getenv("GEMINI_API_KEY")
        if not gemini_key:
            raise VisionProviderUnavailableException("GEMINI_API_KEY is not configured on the backend server.")
        return GeminiVisionProvider(gemini_key)

    # Default to MockVisionProvider for zero-cost, reproducible automated testing
    return MockVisionProvider()
