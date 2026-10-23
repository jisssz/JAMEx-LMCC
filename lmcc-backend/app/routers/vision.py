import base64
from fastapi import APIRouter, HTTPException, status
from app.schemas.vision import VisionExtractionRequest, VisionExtractionResponse
from app.services.vision.provider import get_vision_provider, VisionProviderUnavailableException

router = APIRouter(prefix="/api/extract", tags=["vision"])

# Max allowed image size: 8 MB base64 encoded
MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024


@router.post("/vision", response_model=VisionExtractionResponse)
async def extract_package_labels(payload: VisionExtractionRequest):
    """
    AI-Assisted Multi-Modal Vision Package Label Extraction Fallback.
    Triggered when client-side Tesseract.js OCR yields low quality or ambiguous declarations.
    Requires server-side provider credentials (e.g. GEMINI_API_KEY).
    Returns structured, schema-validated declarations with field confidence.
    """
    # 1. Payload validation
    if len(payload.image_base64) > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Packaging image payload exceeds 8MB maximum size limit.",
        )

    # Validate base64 format
    raw_b64 = payload.image_base64.split(",")[-1]
    try:
        base64.b64decode(raw_b64[:100], validate=True)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid base64 encoded image format.",
        )

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
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Vision extraction processing failed: {str(e)}",
        )
