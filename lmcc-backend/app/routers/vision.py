from fastapi import APIRouter, HTTPException, status
from app.schemas.vision import VisionExtractionRequest, VisionExtractionResponse
from app.services.vision.provider import get_vision_provider, VisionProviderUnavailableException
from app.services.vision.image_payload import decode_image_payload

router = APIRouter(prefix="/api/extract", tags=["vision"])

@router.post("/vision", response_model=VisionExtractionResponse)
async def extract_package_labels(payload: VisionExtractionRequest):
    """
    AI-Assisted Multi-Modal Vision Package Label Extraction Fallback.
    Triggered when client-side Tesseract.js OCR yields low quality or ambiguous declarations.
    Requires server-side provider credentials (e.g. GEMINI_API_KEY).
    Returns structured, schema-validated declarations with field confidence.
    """
    try:
        decode_image_payload(payload.image_base64)
    except ValueError as exc:
        message = str(exc)
        code = status.HTTP_413_CONTENT_TOO_LARGE if "exceeds the 8 MB" in message else status.HTTP_400_BAD_REQUEST
        raise HTTPException(status_code=code, detail=message) from exc

    # 2. Invoke Vision AI Provider
    try:
        provider = get_vision_provider()
        response = await provider.extract_declarations(payload)
        return response
    except VisionProviderUnavailableException as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The configured vision provider could not complete extraction. Verify provider availability and retry.",
        )
