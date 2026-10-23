from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db import get_db
from app.models.report import Report
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


@router.get("/summary/{report_id}", response_model=InspectionSummaryResponse)
async def get_inspection_summary_for_report(report_id: str, db: Session = Depends(get_db)):
    """
    Generate an AI-powered forensic inspection summary directly from a persisted database inspection report.
    Corroborates the actual recorded OCR declarations and issues.
    """
    report = db.query(Report).filter(Report.id == report_id).first()
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inspection report with ID '{report_id}' was not found.",
        )

    # Extract stored declarations and flagged issues
    stored_declarations = {
        "mrp": report.mrp,
        "net_quantity": report.net_quantity,
        "manufacturer": report.manufacturer,
        "date_declaration": report.date_declaration,
        "consumer_care": report.consumer_care,
    }
    raw_issues = report.issues or []
    flagged_rules = [
        issue.get("rule_id") or issue.get("ruleId")
        for issue in raw_issues
        if isinstance(issue, dict) and (issue.get("rule_id") or issue.get("ruleId"))
    ]

    req = InspectionSummaryRequest(
        product_name=report.product_name,
        verdict=report.verdict,
        extracted_declarations=stored_declarations,
        flagged_rules=flagged_rules,
        potential_violations=raw_issues,
        evidence_snippets={"raw_ocr": report.raw_ocr} if report.raw_ocr else {},
    )

    return await generate_inspection_summary(req)


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
