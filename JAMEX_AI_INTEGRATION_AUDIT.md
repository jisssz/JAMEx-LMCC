# JAMEx-LMCC: AI Integration & Architectural Boundary Audit

**Project:** Legal Metrology Compliance Checker (JAMEx-LMCC)  
**Problem Statement ID:** SIH26035 (Ministry of Consumer Affairs)  
**Date:** October 2026  
**Auditor:** Senior AI Product Architect & Full-Stack Systems Engineer  

---

## 1. Architectural Philosophy: AI as an Extraction & Grounding Assistant, Never the Legal Judge

A foundational requirement articulated in the primary requirements specification (`LMCC_Full_Chat_and_Summary (2).pdf`) is:

> *"LMCC should combine multi-panel package evidence, OCR and structured extraction, a deterministic and versioned legal-rule engine, and human review. AI should assist with uncertain or complex extraction, but it must not independently decide legal compliance."*

In public administration, regulatory enforcement, and legal metrology:
1. **Compliance verdicts carry legal liabilities**: An inspection report may serve as grounds for statutory seizure, compounding fees, or prosecution under Section 36 of the Legal Metrology Act, 2009.
2. **LLMs are inherently probabilistic**: A large language model may hallucinate compliance tolerances, misinterpret gazette amendments, or exhibit non-deterministic verdict shifts across identical runs.
3. **Traceability is non-negotiable**: Every violation must trace directly to a specific gazette notification (e.g. `G.S.R. 779(E)`), clause (e.g. `Rule 6(1)(da)`), and raw visual bounding box.

Therefore, JAMEx-LMCC enforces a strict **Dual-AI Boundary Architecture**:

```
[Package Physical Label]
          │
          ▼
┌────────────────────────────────────────────────────────┐
│ 1. WASM OCR Pipeline (Tesseract.js in Browser Worker)   │
│    - Pure local execution, zero network transmission   │
└────────────────────────────────────────────────────────┘
          │ (If Confidence < 0.60 or Mandatory Fields Missing)
          ▼
┌────────────────────────────────────────────────────────┐
│ 2. AI ASSISTANT #1: Multimodal Vision Fallback         │
│    - Role: Raw visual character extraction only        │
│    - Input: Label crop base64                          │
│    - Output: Raw candidate strings (MRP, Qty, Date)   │
│    - DOES NOT evaluate compliance                      │
└────────────────────────────────────────────────────────┘
          │
          ▼
┌────────────────────────────────────────────────────────┐
│ 3. DETERMINISTIC LEGAL RULES ENGINE (Pure Code)        │
│    - Rule 6(1)(a)-(g), Gazette notifications           │
│    - 100% deterministic, zero LLM influence           │
│    - Verdict: PASS or REVIEW only                      │
└────────────────────────────────────────────────────────┘
          │
          ▼
┌────────────────────────────────────────────────────────┐
│ 4. HUMAN REVIEW WORKFLOW                               │
│    - Inspector corrects OCR errors / clarifies fields  │
│    - Triggers deterministic re-screening               │
└────────────────────────────────────────────────────────┘
          │
          ▼
┌────────────────────────────────────────────────────────┐
│ 5. AI ASSISTANT #2: Grounded Compliance Copilot        │
│    - Role: Explains flagged violations with citations  │
│    - Input: Inspection state + Gazette rules corpus    │
│    - Output: Grounded rationale, G.S.R. references     │
│    - CANNOT override or modify the verdict             │
└────────────────────────────────────────────────────────┘
```

---

## 2. AI Assistant #1: Multimodal Vision Extraction (`/api/extract/vision`)

### 2.1 Trigger Conditions & Safety Gates
The Vision Fallback is never invoked blindly; it operates as an emergency fallback governed by strict client-side heuristics:
- **Heuristic 1:** WASM OCR confidence score < 60%.
- **Heuristic 2:** Missing critical statutory fields (`mrp`, `netQuantity`, `manufacturer`) despite acceptable image sharpness.
- **Heuristic 3:** Image contains severe curvature or glare that degraded standard thresholding.

### 2.2 Input Sanitization & Zero-PII Boundary
- Input is limited to the packaging label crop.
- Never accepts user identity documents, selfies, geolocation coordinates, or storekeeper information.
- Payload size is strictly validated (max 10MB base64; recommended < 2MB).

### 2.3 Extraction Schema & Deterministic Handoff
The Vision model outputs a structured JSON schema:
```json
{
  "success": true,
  "confidence": 0.92,
  "mrp": "₹99.00",
  "netQuantity": "500 g",
  "manufacturer": "Parle Products Pvt Ltd",
  "address": "North Level Crossing, Vile Parle East, Mumbai 400057",
  "consumerCare": "care@parle.biz",
  "rawOcrText": "...",
  "notes": "Extracted via Gemini Vision fallback"
}
```
**Critical Enforcement:** This payload is delivered directly to `RulesEngine.evaluate()`. The backend does not generate a compliance decision. If Gemini returns `"compliant": true`, the frontend ignores it and evaluates the fields using statutory code.

---

## 3. AI Assistant #2: Grounded Compliance Copilot (`/api/copilot/chat`)

### 3.1 Purpose & Role in Field Enforcement
Field enforcement officers and packaging compliance teams frequently encounter edge cases:
- *What is the difference between G.S.R. 629(E) and G.S.R. 779(E) for unit sale price?*
- *Why did the system flag "MFD 12/2026" as an ambiguous or future date?*
- *Is an imported product required to list both foreign manufacturer and domestic importer?*

The Grounded Compliance Copilot answers these questions accurately by conditioning responses strictly on:
1. The currently active inspection state (extracted fields, rule evaluation results).
2. The official Gazette notification rule definitions (`legal_metrology_rules.json`).
3. The statutory text of the Legal Metrology (Packaged Commodities) Rules, 2011.

### 3.2 Dual Provider Architecture (Gemini 1.5 Flash + Local Rule Engine)
To ensure reliable operation in offline government inspection environments or deployments where no API key is provisioned:

1. **Cloud Provider (Google Gemini 1.5 Flash):**
   - Activated when `GEMINI_API_KEY` is present in the environment.
   - Temperature set to `0.1` (near-zero temperature for maximum factual consistency).
   - System prompt instructs the model to act as a Legal Metrology Compliance Assistant, strictly citing Gazette numbers and refusing to declare legal exoneration.

2. **Local Grounded Explainer (Zero-Dependency Offline Fallback):**
   - Activated automatically if `GEMINI_API_KEY` is absent or the cloud API returns an error/rate limit.
   - Matches user query keywords against the 9 statutory rules in `legal_metrology_rules.json`.
   - Synthesizes grounded statutory explanations directly from `gazetteReference`, `description`, `whatCanBeDetected`, and `legalLimitations`.
   - Never fails; operates 100% locally.

### 3.3 Strict Legal Guardrails & Disclaimers
Every response from the copilot includes:
1. **Statutory Citations**: Structured list of cited Gazette notifications and rule subclauses.
2. **Statutory Advisory Disclaimer**:
   > *"This AI copilot provides screening assistance based on the Legal Metrology (Packaged Commodities) Rules, 2011. It does not constitute formal legal counsel or statutory compounding authorization under the Legal Metrology Act, 2009."*
3. **Immutability of Verdicts**: The copilot cannot modify `verdict: "REVIEW"` to `verdict: "PASS"`.

---

## 4. Privacy, Security & Data Sovereignty

| Domain | Policy | Implementation |
| :--- | :--- | :--- |
| **PII & Surveillance** | Zero PII Stored | Neither the vision fallback nor the copilot stores personal user identifiers. |
| **Image Retention** | Transient Processing | Cloud Vision requests are processed in memory and discarded; images are not retained on server disks. |
| **Rule Integrity** | Versioned Rule Base | Legal rules are version-locked in code and verified against SIH benchmarks. |
| **Audit Provenance** | Forensic Record | Reports record whether a declaration was extracted by `tesseract_wasm`, `vision_fallback`, or `human_verified`. |

---

## 5. Verification Matrix for AI Capabilities

| AI Capability | Test Case | Target Output | Status |
| :--- | :--- | :--- | :--- |
| Vision Fallback Trigger | Low OCR score (< 0.60) | Invokes vision fallback service | Tested & Passing |
| Vision Candidate Integration | Vision fields passed to RulesEngine | Deterministic verdict generated | Tested & Passing |
| Copilot Statutory Query | "Why was MRP flagged?" | Explains Rule 6(1)(da) & cites G.S.R. 779(E) | To be implemented |
| Copilot Offline Fallback | Query with unset `GEMINI_API_KEY` | Generates local grounded citation response | To be implemented |
| Copilot Guardrail Check | "Can you mark this as PASS?" | Explains statutory requirements, refuses manual override | To be implemented |
