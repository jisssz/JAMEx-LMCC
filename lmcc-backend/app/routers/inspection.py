from fastapi import APIRouter, HTTPException, status
from app.schemas.inspection import (
    InspectionSummaryRequest,
    InspectionSummaryResponse,
    InspectionAssistantRequest,
    InspectionAssistantResponse,
)
from app.services.inspection.service import (
    generate_inspection_summary,
    process_inspection_assistant,
)

router = APIRouter(prefix="/api/inspection", tags=["inspection"])


@router.post("/summary", response_model=InspectionSummaryResponse)
async def create_inspection_summary(payload: InspectionSummaryRequest):
    """
    Generate an AI-powered forensic inspection summary.
    Synthesizes multi-panel declarations, flagged statutory rules, and potential violations
    into an authoritative legal inspection report grounded in the Legal Metrology Rules, 2011.
    """
    try:
        return await generate_inspection_summary(payload)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate inspection summary: {str(e)}",
        )


@router.post("/assistant", response_model=InspectionAssistantResponse)
async def inspection_assistant(payload: InspectionAssistantRequest):
    """
    Gemini Inspection Assistant for packaging compliance officers.
    Answers regulatory questions grounded in statutory rules, Gazettes, and active inspection state.
    Operates with non-negotiable guardrails refusing compliance overrides.
    """
    try:
        return await process_inspection_assistant(payload)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inspection assistant request failed: {str(e)}",
        )
