import logging
from typing import Optional
from fastapi import APIRouter, Query, HTTPException, status
from app.schemas.copilot import (
    CopilotQueryRequest,
    CopilotResponse,
    LegalRuleSearchResponse,
    LegalRuleItem,
)
from app.services.copilot.copilot_service import process_copilot_query
from app.services.copilot.rules_corpus import search_rules, get_rule_by_id

router = APIRouter(prefix="/api", tags=["copilot"])
logger = logging.getLogger(__name__)


@router.post("/copilot/chat", response_model=CopilotResponse)
async def copilot_chat(payload: CopilotQueryRequest):
    """
    Grounded AI Compliance Copilot for Legal Metrology.
    Answers regulatory questions grounded in Rule 6(1)(a)-(g) and official Gazette notifications.
    Operates with strict non-overriding guardrails and zero-PII privacy guarantee.
    """
    try:
        return await process_copilot_query(payload)
    except Exception:
        logger.exception("Copilot provider failed")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="The compliance assistant is temporarily unavailable. Please retry.",
        )


@router.get("/rules/search", response_model=LegalRuleSearchResponse)
def search_statutory_rules(
    q: Optional[str] = Query(None, description="Keyword search across rule text and gazette references"),
    field: Optional[str] = Query(None, description="Filter by packaging field (mrp, netQuantity, etc.)"),
    severity: Optional[str] = Query(None, description="Filter by severity level (critical, high, medium)"),
):
    """
    Search and retrieve statutory rules from the Legal Metrology (Packaged Commodities) Rules, 2011 corpus.
    """
    matched = search_rules(query=q, field=field, severity=severity)
    return LegalRuleSearchResponse(total=len(matched), rules=matched)


@router.get("/rules/{rule_id}", response_model=LegalRuleItem)
def get_statutory_rule(rule_id: str):
    """
    Fetch complete metadata and Gazette reference for a specific statutory rule ID.
    """
    rule = get_rule_by_id(rule_id)
    if not rule:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Rule '{rule_id}' not found.")
    return rule
