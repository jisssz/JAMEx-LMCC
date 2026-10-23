# JAMEx-LMCC: Deployment & Rollback Strategy

**Project:** Legal Metrology Compliance Checker (JAMEx-LMCC)  
**Problem Statement ID:** SIH26035  
**Target Branch:** `feat/complete-product-ai-intelligence`  
**Date:** October 2026  

---

## 1. Production Architecture Overview

The deployed JAMEx-LMCC application operates across a decoupled, resilient architecture:

```
┌────────────────────────────────────────────────────────┐
│ Canonical Frontend (Vercel):                           │
│ https://lmcc-web-ten.vercel.app                        │
│ - React 18, Vite PWA, Tailwind CSS, Lucide, Motion     │
│ - Client-Side WASM OCR (Tesseract.js Web Worker)       │
│ - Client-Side Offline Persistence (IndexedDB)          │
│ - In-browser Deterministic Rules Engine                │
└────────────────────────────────────────────────────────┘
                           │
                           ▼ HTTPS API (CORS configured)
┌────────────────────────────────────────────────────────┐
│ Independent Backend (Vercel Serverless / Render Web):  │
│ https://lmcc-backend.vercel.app                        │
│ - FastAPI + SQLite / PostgreSQL auto-migration         │
│ - Reporting Registry (/api/report, /api/reports)       │
│ - Surveillance Analytics (/api/analytics/*)            │
│ - Multi-Modal Vision Fallback (/api/extract/vision)    │
│ - Grounded AI Copilot (/api/copilot/chat)              │
│ - Statutory Rules Search (/api/rules/search)           │
└────────────────────────────────────────────────────────┘
```

---

## 2. Environment Variables Configuration

### Frontend (`lmcc-web`)
| Variable | Value | Purpose |
| :--- | :--- | :--- |
| `VITE_API_URL` | `https://lmcc-backend.vercel.app` | Base URL for reporting, analytics, vision, and copilot endpoints |

### Backend (`lmcc-backend`)
| Variable | Value | Purpose |
| :--- | :--- | :--- |
| `DATABASE_URL` | `sqlite:///./reports.db` or PostgreSQL URI | Centralized report storage |
| `FRONTEND_ORIGINS` | `https://lmcc-web-ten.vercel.app,http://localhost:5173` | Allowed CORS origins |
| `GEMINI_API_KEY` | *(Optional secret)* | Cloud Vision fallback & AI Copilot cloud reasoning |
| `VISION_PROVIDER` | `gemini` (or `mock` for local evaluation) | Vision provider selection |
| `COPILOT_PROVIDER` | `gemini` (or `local` for deterministic rule engine) | Copilot provider selection |

---

## 3. Deployment Steps

### Frontend Deployment (Vercel):
```bash
cd lmcc-web
npm ci
npm run build
# Deploy via Vercel CLI or GitHub CI/CD:
vercel --prod
```

### Backend Deployment (Vercel / Render):
```bash
cd lmcc-backend
# Vercel serverless entry point is in api/index.py with vercel.json rewrites:
vercel --prod
```

---

## 4. Smoke Test Verification Checklist

Following deployment, execute these verification checks:
1. **Health Check:** `curl -s https://lmcc-backend.vercel.app/api/health` returns `{"status":"ok"}`.
2. **Rules Search API:** `curl -s "https://lmcc-backend.vercel.app/api/rules/search?q=mrp"` returns statutory rule `LM-PCR-2011-R6-1-DA` citing `G.S.R. 779(E)`.
3. **Copilot Chat API:** `curl -s -X POST https://lmcc-backend.vercel.app/api/copilot/chat -H "Content-Type: application/json" -d '{"query":"Why was MRP flagged?"}'` returns grounded answer and citations.
4. **Client Scan & Human Review:**
   - Open `https://lmcc-web-ten.vercel.app/scan` in browser.
   - Upload sample package label or scan panels.
   - Verify that clicking "Ask AI Copilot" opens slide-over drawer with suggested questions.
   - Verify that clicking "Review & Edit Declarations" opens human review modal, allows editing, and triggers instant deterministic re-screening.
5. **PDF & CSV Export:** Verify that clicking "Export PDF" and "Export CSV" generates files with Gazette citations and reviewer notes.

---

## 5. Rollback Procedures

If an issue is detected in production:
1. **Immediate Frontend Rollback (Vercel Dashboard / CLI):**
   ```bash
   vercel rollback
   ```
   Reverts instantly to the previous production deployment commit `294c50b` (verified UI baseline).
2. **Backend Rollback:**
   - Previous backend deployments remain active and unchanged on Vercel.
   - In Vercel Project Settings > Deployments, select the prior stable deployment and click "Promote to Production".
3. **Data Integrity Guarantee:**
   - The SQLite database schema uses additive migrations; columns are backwards-compatible.
   - Client-side IndexedDB gracefully ignores unrecognised fields.
