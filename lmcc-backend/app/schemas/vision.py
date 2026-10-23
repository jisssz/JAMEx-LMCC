from typing import List, Optional, Literal
from pydantic import BaseModel, Field


class ExtractedFieldItem(BaseModel):
    value: Optional[str] = None
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    status: Literal["detected", "uncertain", "not_detected"] = "not_detected"
    evidence_snippet: Optional[str] = None


class VisionExtractionRequest(BaseModel):
    image_base64: str = Field(..., description="Base64 encoded packaging image (JPEG/PNG/WEBP)")
    ocr_text_context: Optional[str] = Field(None, max_length=10000, description="Optional raw OCR text from client Tesseract Pass 1/2")
    low_confidence_fields: Optional[List[str]] = Field(default=None, description="List of fields flagged as uncertain by client quality gate")


class VisionExtractionResponse(BaseModel):
    product_name: ExtractedFieldItem = Field(default_factory=ExtractedFieldItem)
    mrp: ExtractedFieldItem = Field(default_factory=ExtractedFieldItem)
    net_quantity: ExtractedFieldItem = Field(default_factory=ExtractedFieldItem)
    manufacturer: ExtractedFieldItem = Field(default_factory=ExtractedFieldItem)
    date_declaration: ExtractedFieldItem = Field(default_factory=ExtractedFieldItem)
    consumer_care: ExtractedFieldItem = Field(default_factory=ExtractedFieldItem)
    provider_used: str = "mock"
    is_ai_fallback: bool = True
    provenance: str = "AI Vision-Assisted Extraction"
    disclaimer: str = "AI extracted fields are advisory and require human verification before legal evaluation."
