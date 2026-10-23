from app.schemas.inspection import (
    InspectionSummaryRequest,
    InspectionSummaryResponse,
    InspectionAssistantRequest,
    InspectionAssistantResponse,
)
from app.services.inspection.provider import get_inspection_provider


async def generate_inspection_summary(
    request: InspectionSummaryRequest,
) -> InspectionSummaryResponse:
    """Dispatches inspection summary request to configured provider with deterministic fallback."""
    provider = get_inspection_provider()
    return await provider.generate_summary(request)


async def process_inspection_assistant(
    request: InspectionAssistantRequest,
) -> InspectionAssistantResponse:
    """Dispatches inspection assistant inquiry to configured provider with deterministic fallback."""
    provider = get_inspection_provider()
    return await provider.assistant_chat(request)
