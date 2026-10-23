from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, model_validator


class GroundedCitation(BaseModel):
    rule_id: str
    clause: str
    title: str
    gazette_reference: str
    summary: str


class CopilotQueryRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=1000, description="Inspector or user query regarding packaging compliance")
    product_name: Optional[str] = Field(None, description="Optional product or brand name")
    verdict: Optional[str] = Field(None, description="Current inspection verdict: PASS or REVIEW")
    extracted_fields: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Current extracted label declarations")
    extracted_declarations: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Current extracted label declarations")
    flagged_rules: Optional[List[str]] = Field(default_factory=list, description="IDs of rules currently flagged in inspection")
    potential_violations: Optional[List[Dict[str, Any]]] = Field(default_factory=list, description="Structured violation records")
    evidence_snippets: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Multi-panel evidence snippets")
    commodity: Optional[str] = Field(None, description="Optional package commodity type")

    @model_validator(mode="before")
    @classmethod
    def sync_extracted_data(cls, values):
        if isinstance(values, dict):
            if "extracted_declarations" in values and ("extracted_fields" not in values or not values.get("extracted_fields")):
                values["extracted_fields"] = values["extracted_declarations"]
            elif "extracted_fields" in values and ("extracted_declarations" not in values or not values.get("extracted_declarations")):
                values["extracted_declarations"] = values["extracted_fields"]
        return values


class CopilotResponse(BaseModel):
    answer: str
    citations: List[GroundedCitation] = Field(default_factory=list)
    suggested_followups: List[str] = Field(default_factory=list)
    is_offline_fallback: bool = False
    provider_used: str = "local-grounded-engine"
    legal_disclaimer: str = (
        "Statutory Screening Copilot. Guidance is based on the Legal Metrology (Packaged Commodities) "
        "Rules, 2011. Does not constitute formal compounding authorization under the Legal Metrology Act, 2009."
    )


class LegalRuleItem(BaseModel):
    id: str
    field: str
    title: str
    description: str
    severity: str
    source: str
    gazetteReference: str
    whatCanBeDetected: str
    legalLimitations: str
    enabled: bool = True


class LegalRuleSearchResponse(BaseModel):
    total: int
    rules: List[LegalRuleItem]
