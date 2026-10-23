import os
import httpx
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


@router.get("/diagnostic")
async def inspection_diagnostic():
    """
    Sanitized diagnostic endpoint to test Gemini API connectivity without exposing secret values.
    """
    gemini_key = (os.getenv("GEMINI_API_KEY") or "").strip()
    configured_model = (os.getenv("GEMINI_MODEL") or "gemini-3.8-flash").strip()
    if not gemini_key:
        return {
            "gemini_key_configured": False,
            "configured_model": configured_model,
            "status": "No GEMINI_API_KEY present in environment",
        }

    headers = {
        "x-goog-api-key": gemini_key,
        "Content-Type": "application/json",
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        # Check available models
        resp = await client.get(
            "https://generativelanguage.googleapis.com/v1beta/models",
            headers=headers,
        )
        models_data = []
        err_msg = None
        if resp.status_code == 200:
            try:
                data = resp.json()
                models_data = [
                    m.get("name")
                    for m in data.get("models", [])
                    if "generateContent" in m.get("supportedGenerationMethods", [])
                ]
            except Exception as e:
                err_msg = f"Failed to parse models json: {str(e)}"
        else:
            err_msg = resp.text[:500]

        # Also test a minimal 1-token generateContent request with configured model
        gen_status = None
        gen_err = None
        test_url = f"https://generativelanguage.googleapis.com/v1beta/models/{configured_model}:generateContent"
        try:
            gen_resp = await client.post(
                test_url,
                headers=headers,
                json={"contents": [{"parts": [{"text": "ping"}]}]},
            )
            gen_status = gen_resp.status_code
            if gen_status != 200:
                gen_err = gen_resp.text[:500]
        except Exception as e:
            gen_err = str(e)

        return {
            "gemini_key_configured": True,
            "key_prefix": gemini_key[:4] + "..." if len(gemini_key) > 4 else "...",
            "configured_model": configured_model,
            "models_endpoint_status": resp.status_code,
            "available_models_count": len(models_data),
            "available_models_sample": [m for m in models_data if "gemini" in m],
            "models_endpoint_error": err_msg,
            "generate_content_test_status": gen_status,
            "generate_content_error": gen_err,
        }
