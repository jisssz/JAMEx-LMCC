import os
import re
import json
import logging
from typing import List, Optional
import httpx

logger = logging.getLogger(__name__)


def _parse_gemini_json(raw_text: str) -> dict:
    """Safely extracts JSON from Gemini output, handling code fences or extraneous whitespace."""
    text = (raw_text or "").strip()
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    text = text.strip()
    try:
        return json.loads(text)
    except Exception:
        m = re.search(r"(\{.*\})", text, re.DOTALL)
        if m:
            return json.loads(m.group(1))
        raise
from app.schemas.copilot import (
    CopilotQueryRequest,
    CopilotResponse,
    GroundedCitation,
)
from app.services.copilot.rules_corpus import (
    STATUTORY_RULES_CORPUS,
    search_rules,
    get_rule_by_id,
)


class LocalGroundedCopilot:
    """
    Deterministic rule-based explanation engine.
    Ensures 100% offline availability, zero token costs, and 100% factual fidelity
    to the Legal Metrology (Packaged Commodities) Rules, 2011.
    """

    @classmethod
    def answer(cls, request: CopilotQueryRequest) -> CopilotResponse:
        q = request.query.lower().strip()
        matched_rules = []
        citations = []
        suggested_followups = []

        # 1. Guardrail against overriding compliance verdicts
        if any(w in q for w in ["override", "make it pass", "mark pass", "force pass", "change verdict"]):
            return CopilotResponse(
                answer=(
                    "Under Section 36 of the Legal Metrology Act, 2009 and the LMCC architecture, compliance "
                    "verdicts are strictly deterministic. The AI Copilot cannot manually override or alter an inspection "
                    "verdict to 'PASS'. If a declaration is missing, ambiguous, or conflicting, you must perform "
                    "physical verification or use the Human Review workflow to correct verified visual misreadings."
                ),
                citations=[
                    GroundedCitation(
                        rule_id="LM-ACT-2009-S36",
                        clause="Section 36, Legal Metrology Act, 2009",
                        title="Penalty for Non-Standard Packages",
                        gazette_reference="Act No. 1 of 2010 (Ministry of Consumer Affairs)",
                        summary="Mandates penalties for manufacture, packing, or sale of non-conforming pre-packaged commodities.",
                    )
                ],
                suggested_followups=[
                    "What are the compounding provisions for first-time offences?",
                    "How do I use Human Review to correct an OCR misreading?",
                    "Which mandatory declarations are currently flagged?",
                ],
                is_offline_fallback=True,
                provider_used="local-grounded-engine (guardrail)",
            )

        # 2. Check flagged rules context
        if request.flagged_rules:
            for rid in request.flagged_rules:
                r = get_rule_by_id(rid)
                if r and r not in matched_rules:
                    matched_rules.append(r)

        # 3. Keyword matching across statutory declarations
        if any(w in q for w in ["mrp", "price", "retail", "tax", "inclusive", "overcharging"]):
            r = get_rule_by_id("LM-PCR-2011-R6-1-DA")
            if r and r not in matched_rules:
                matched_rules.append(r)
        if any(w in q for w in ["quantity", "net qty", "weight", "volume", "standard unit", "grams", "litres", "piece"]):
            r = get_rule_by_id("LM-PCR-2011-R6-1-C")
            if r and r not in matched_rules:
                matched_rules.append(r)
        if any(w in q for w in ["manufacturer", "packer", "importer", "brand", "company"]):
            r = get_rule_by_id("LM-PCR-2011-R6-1-A-NAME")
            if r and r not in matched_rules:
                matched_rules.append(r)
        if any(w in q for w in ["address", "factory", "premises", "pin code", "postal"]):
            r = get_rule_by_id("LM-PCR-2011-R6-1-A-ADDR")
            if r and r not in matched_rules:
                matched_rules.append(r)
        if any(w in q for w in ["date", "mfd", "pkd", "month", "year", "post-dated", "expiry"]):
            r = get_rule_by_id("LM-PCR-2011-R6-1-D")
            if r and r not in matched_rules:
                matched_rules.append(r)
        if any(w in q for w in ["consumer care", "helpline", "email", "customer care", "complaint", "redressal"]):
            r = get_rule_by_id("LM-PCR-2011-R6-1-E")
            if r and r not in matched_rules:
                matched_rules.append(r)

        # If no specific rule matched, include all relevant active rules
        if not matched_rules:
            matched_rules = STATUTORY_RULES_CORPUS[:3]

        # Build Citations
        for r in matched_rules:
            citations.append(
                GroundedCitation(
                    rule_id=r.id,
                    clause=r.source,
                    title=r.title,
                    gazette_reference=r.gazetteReference,
                    summary=r.description,
                )
            )

        # Generate Grounded Rationale
        response_sections = []

        # Summarize inspection context if provided
        if request.verdict:
            verdict_text = f"**Current Inspection State:** Evaluated as `{request.verdict}`."
            if request.flagged_rules:
                verdict_text += f" Flagged statutory rule(s): {', '.join(request.flagged_rules)}."
            response_sections.append(verdict_text)

        # Specific query handling
        if any(w in q for w in ["why", "flag", "reason", "issue", "violation"]):
            reasons = []
            for r in matched_rules:
                reasons.append(
                    f"• **{r.title} ({r.source})**: Under {r.gazetteReference}, {r.description.lower()} "
                    f"**Detection scope:** {r.whatCanBeDetected} **Legal Limitation:** {r.legalLimitations}"
                )
            response_sections.append(
                "**Statutory Analysis & Why It Was Flagged:**\n" + "\n".join(reasons)
            )
            suggested_followups = [
                "What physical checks should the inspector conduct?",
                "How do I correct an OCR misreading using Human Review?",
                "What is the statutory penalty under Section 36?",
            ]
        elif any(w in q for w in ["physical", "field check", "inspect", "scale"]):
            response_sections.append(
                "**Inspector Physical Verification Protocol:**\n"
                "1. **Net Quantity Check**: Calibrated laboratory balance verification as per Second Schedule tolerances.\n"
                "2. **Point of Sale Pricing**: Verify actual scanning price against declared MRP (overcharging check).\n"
                "3. **Address Verification**: Confirm physical existence of registered premises or factory.\n"
                "4. **Consumer Redressal Test**: Dial declared helpline or transmit verification email to ensure responsiveness."
            )
            suggested_followups = [
                "What are the permissible maximum error limits for net quantity?",
                "Can unit sale price be declared instead of MRP?",
            ]
        elif any(w in q for w in ["date", "mfd", "pkd"]):
            response_sections.append(
                "**Statutory Date Requirements (G.S.R. 779(E)):**\n"
                "Per Rule 6(1)(d) as amended effective 01-12-2022, every package must clearly state the month and year "
                "of manufacture, packing, or import (e.g. `09/2026` or `Sep 2026`). Isolated date numbers lacking a "
                "statutory prefix (MFD/PKD) or future post-dated manufacturing dates strictly require `REVIEW`."
            )
            suggested_followups = [
                "Why is a post-dated MFD treated as a violation?",
                "Are 'Best Before' dates an acceptable substitute for MFD?",
            ]
        else:
            # General statutory guidance
            guidance = []
            for r in matched_rules:
                guidance.append(
                    f"• **{r.title}** ({r.source}): {r.description} (Ref: *{r.gazetteReference}*)"
                )
            response_sections.append(
                "**Applicable Legal Metrology Provisions:**\n" + "\n".join(guidance)
            )
            suggested_followups = [
                "Why was this label flagged for REVIEW?",
                "What physical verification is required for net quantity?",
                "How do I re-screen after human correction?",
            ]

        # Extracted fields context note
        if request.extracted_fields:
            fields_summary = ", ".join([f"{k}: '{v}'" for k, v in request.extracted_fields.items() if v])
            if fields_summary:
                response_sections.append(f"\n*Evaluated declarations from package:* {fields_summary}")

        answer_text = "\n\n".join(response_sections)

        return CopilotResponse(
            answer=answer_text,
            citations=citations,
            suggested_followups=suggested_followups,
            is_offline_fallback=True,
            provider_used="local-grounded-engine",
        )


class GeminiGroundedCopilot:
    """
    Google Gemini Grounded Copilot.
    Conditioned strictly on statutory rules and inspection context.
    """

    def __init__(self, api_key: str, model: Optional[str] = None):
        self.api_key = api_key.strip()
        self.model = (model or os.getenv("GEMINI_MODEL") or "gemini-3.8-flash").strip()

    def _get_headers(self) -> dict:
        return {
            "Content-Type": "application/json",
            "x-goog-api-key": self.api_key,
        }

    async def answer(self, request: CopilotQueryRequest) -> CopilotResponse:
        system_instructions = (
            "You are the JAMEx Legal Metrology Compliance Copilot, assisting officers and packaging teams "
            "with India's Legal Metrology (Packaged Commodities) Rules, 2011 and Legal Metrology Act, 2009.\n"
            "STRICT RULES:\n"
            "1. Ground all answers strictly in Rule 6(1)(a)-(g) and official Gazette Notifications: "
            "G.S.R. 202(E), G.S.R. 629(E), G.S.R. 779(E), and G.S.R. 359(E).\n"
            "2. Never hallucinate non-existent rules or grant legal clearance.\n"
            "3. If asked to override a verdict, state that compliance decisions are strictly deterministic code.\n"
            "4. Return valid JSON matching the schema:\n"
            "{\"answer\": \"...\", \"citations\": [{\"rule_id\": \"...\", \"clause\": \"...\", \"title\": \"...\", "
            "\"gazette_reference\": \"...\", \"summary\": \"...\"}], \"suggested_followups\": [\"...\"]}"
        )

        user_content = {
            "query": request.query,
            "current_verdict": request.verdict,
            "extracted_fields": request.extracted_fields,
            "flagged_rules": request.flagged_rules,
            "commodity": request.commodity,
        }

        payload = {
            "systemInstruction": {"parts": [{"text": system_instructions}]},
            "contents": [
                {"parts": [{"text": json.dumps(user_content)}]}
            ],
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.1,
            },
        }

        headers = self._get_headers()
        candidates = [self.model, "gemini-3.8-flash", "gemini-flash-latest", "gemini-3.7-flash"]
        seen = set()
        models_to_try = [m for m in candidates if m and not (m in seen or seen.add(m))]

        resp = None
        used_model = self.model
        async with httpx.AsyncClient(timeout=10.0) as client:
            for cand in models_to_try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{cand}:generateContent"
                cand_resp = await client.post(url, json=payload, headers=headers)
                resp = cand_resp
                used_model = cand
                if cand_resp.status_code == 200:
                    break
                logger.warning("Gemini copilot model %s returned status %d: %s", cand, cand_resp.status_code, cand_resp.text[:300])
                if cand_resp.status_code != 404:
                    break

            if not resp or resp.status_code != 200:
                raise Exception(f"Gemini API returned status {resp.status_code if resp else 'none'}: {resp.text if resp else ''}")

            res_json = resp.json()
            raw_text = res_json["candidates"][0]["content"]["parts"][0]["text"]
            parsed = _parse_gemini_json(raw_text)

            citations_raw = parsed.get("citations", [])
            citations = []
            for c in citations_raw:
                if isinstance(c, dict):
                    citations.append(
                        GroundedCitation(
                            rule_id=c.get("rule_id", "LM-PCR-2011-R6"),
                            clause=c.get("clause", "Rule 6, PCR 2011"),
                            title=c.get("title", "Statutory Rule"),
                            gazette_reference=c.get("gazette_reference", "G.S.R. 779(E)"),
                            summary=c.get("summary", ""),
                        )
                    )

            # If Gemini didn't return citations, populate from local corpus
            if not citations:
                local_fallback = LocalGroundedCopilot.answer(request)
                citations = local_fallback.citations

            return CopilotResponse(
                answer=parsed.get("answer", "Analysis completed based on Legal Metrology provisions."),
                citations=citations,
                suggested_followups=parsed.get("suggested_followups", [
                    "What physical checks should the inspector conduct?",
                    "How do I correct an OCR misreading using Human Review?",
                ]),
                is_offline_fallback=False,
                provider_used=f"gemini-{used_model}",
            )


async def process_copilot_query(request: CopilotQueryRequest) -> CopilotResponse:
    """Dispatches copilot query to Gemini (if configured) or falls back to LocalGroundedCopilot."""
    gemini_key = (os.getenv("GEMINI_API_KEY") or "").strip()
    provider_type = (os.getenv("COPILOT_PROVIDER") or "").strip().lower()

    if gemini_key and provider_type not in ["mock", "local"]:
        try:
            model = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")
            copilot = GeminiGroundedCopilot(api_key=gemini_key, model=model)
            return await copilot.answer(request)
        except Exception as e:
            logger.warning("Gemini copilot query failed, using fallback: %s", str(e)[:300])
            # Transparent fallback on any network error, rate limit, or invalid response
            fallback_res = LocalGroundedCopilot.answer(request)
            fallback_res.is_offline_fallback = True
            fallback_res.provider_used = "local-grounded-engine (fallback)"
            return fallback_res

    return LocalGroundedCopilot.answer(request)
