# JAMEx-LMCC: Implementation Roadmap & Execution Plan

**Project:** Legal Metrology Compliance Checker (JAMEx-LMCC)  
**Problem Statement ID:** SIH26035  
**Target Branch:** `feat/complete-product-ai-intelligence`  
**Date:** October 2026  

---

## 1. Overview & Objectives

This roadmap outlines the disciplined, step-by-step engineering execution to bring JAMEx-LMCC to **100% functional completeness** per the primary requirements document (`LMCC_Full_Chat_and_Summary (2).pdf`).

### Goals:
1. Deliver the **Grounded AI Compliance Copilot** (`POST /api/copilot/chat`) on the backend with Gemini 1.5 Flash integration and robust zero-cloud deterministic fallback.
2. Deliver the **Interactive Legal Source Retrieval API** (`GET /api/rules/search`).
3. Build the **Frontend Compliance Copilot Slide-over Sheet** (`ComplianceCopilotSheet.tsx`).
4. Build the **Frontend Human Review & Re-Screening Modal** (`HumanReviewModal.tsx`) enabling candidate correction and deterministic re-screening.
5. Integrate both features into `Results.tsx`, `ReportDetail.tsx`, and `AuthorityDashboard.tsx`.
6. Add comprehensive unit and integration tests for all newly implemented capabilities.
7. Verify 100% passing test status (frontend + backend) and zero-error production build.

---

## 2. Phased Engineering Schedule

```
┌────────────────────────────────────────────────────────┐
│ Phase 1: Backend Copilot & Legal Retrieval Router      │
│  - Schemas: CopilotQueryRequest, CopilotResponse       │
│  - Copilot Service with Gemini & Offline Local Engine  │
│  - Legal Rules Retrieval Router (/api/rules/search)    │
│  - Pytest regression suite (test_copilot.py)           │
└────────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ Phase 2: Frontend Grounded AI Copilot Drawer           │
│  - ComplianceCopilotSheet.tsx with slide-over motion   │
│  - Quick-prompt chips & statutory citation badges      │
│  - Zero-cloud offline fallback handling in browser    │
└────────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ Phase 3: Frontend Human Review & Re-Screening Modal    │
│  - HumanReviewModal.tsx for candidate field correction │
│  - Conflict resolution selector between panels         │
│  - Instant deterministic re-screening with RulesEngine │
│  - Forensic provenance tracking ('human_verified')     │
└────────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ Phase 4: Page Integration & Verification               │
│  - Integrate into Results.tsx, ReportDetail.tsx        │
│  - Export updated PDF & CSV with human review flags    │
│  - Add frontend tsx test suite                         │
│  - Run npm run test:all & pytest                       │
└────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Phase Breakdown

### Phase 1: Backend Copilot & Legal Retrieval
- **Files to create/modify:**
  - `lmcc-backend/app/schemas/copilot.py`: Pydantic models for request, response, and citations.
  - `lmcc-backend/app/services/copilot/copilot_service.py`: Retrieval engine loading rules and invoking Gemini/Local explainer.
  - `lmcc-backend/app/routers/copilot.py`: FastAPI endpoints for `/api/copilot/chat` and `/api/rules/search`.
  - `lmcc-backend/app/main.py`: Router registration and root aliases.
  - `lmcc-backend/tests/test_copilot.py`: Pytest suite verifying query handling, citations, offline fallback, and guardrails.

### Phase 2: Frontend Grounded AI Copilot
- **Files to create/modify:**
  - `lmcc-web/src/components/copilot/ComplianceCopilotSheet.tsx`: Accessible drawer component with chat stream, suggested questions, and clickable Gazette citations.
  - `lmcc-web/src/services/api.ts`: Add `askComplianceCopilot(payload)` and `searchLegalRules(params)`.

### Phase 3: Frontend Human Review & Re-Screening
- **Files to create/modify:**
  - `lmcc-web/src/components/review/HumanReviewModal.tsx`: Field editor dialog allowing correction of MRP, Net Qty, Manufacturer, Address, Dates, and Consumer Care, with conflict resolution for multi-panel discrepancies.
  - `lmcc-web/src/models/ExtractedLabel.ts`: Add `isHumanVerified?: boolean` and provenance tracking.

### Phase 4: Integration & Full Verification
- **Files to create/modify:**
  - `lmcc-web/src/pages/Results.tsx`: Add "Ask Copilot" button and "Review & Edit Fields" button; update live state upon review completion.
  - `lmcc-web/src/pages/ReportDetail.tsx`: Add Copilot and Human Review actions for stored reports.
  - `lmcc-web/tests/copilot_review_tests.ts`: Test suite verifying copilot queries, human edits, and re-screening triggers.

---

## 4. Acceptance Criteria & Quality Gates

1. **Deterministic Rule Engine Protection**: Under no circumstances may the Copilot or Human Review bypass deterministic statutory evaluation rules.
2. **Offline Resilience**: Both Copilot and Human Review must function smoothly when backend or Gemini API key is unavailable.
3. **Audit Provenance**: Any field edited by a human must be marked as `human_verified` in both UI and exported PDF/CSV reports.
4. **Zero Test Regressions**: All 29 backend pytest tests and 113 frontend tests must continue to pass 100%. All new tests must pass.
5. **Clean Production Build**: `npm run build` must complete with 0 TypeScript or Vite errors.
