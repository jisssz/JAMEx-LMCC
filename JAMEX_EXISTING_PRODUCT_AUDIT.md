# JAMEx / LMCC — Existing Product & Architecture Audit

**Document ID:** `JAMEX_EXISTING_PRODUCT_AUDIT`  
**Repository:** `jisssz/JAMEx-LMCC`  
**Audit Date:** October 2026  
**Status:** Verified Against Working Codebase  

---

## 1. Architectural Overview & Component Inventory

### Frontend Architecture
- **Framework:** React 18.3.1 with TypeScript 5.6.3, bundled via Vite 6.0.3 and configured with `vite-plugin-pwa` 1.3.0 for offline service-worker caching.
- **Routing:** `react-router-dom` 6.28.0 (Client-side browser routing).
- **Styling:** Tailwind CSS 3.4.16 with PostCSS and custom dark theme tokens (`obsidian-950`, `gov-500`, `sih-saffron/green`).
- **Icons:** `lucide-react` 1.16.0.
- **Image Processing & OCR:**
  - `tesseract.js` 5.1.1 running client-side WebAssembly with offline `.traineddata` models for English (`eng`), Hindi (`hin`), Tamil (`tam`), Malayalam (`mal`), and Orientation Script Detection (`osd`).
  - `@zxing/library` 0.23.0 for client-side EAN-13 and GS1 barcode reading.
- **Exporting:** `jspdf` 4.2.1 for vector client-side inspection certificate generation.

### Page Inventory & Route Map
| Route | Component | Status | Key Features |
| :--- | :--- | :--- | :--- |
| `/` | `Home.tsx` | Operational | Hero banner, statutory rules overview, scan action cards, How-It-Works modal |
| `/scan` | `Scan.tsx` | Operational | 4-panel multi-panel selector (Front, Back, Crimp, Side), live camera capture, file upload, image quality gate, language selection |
| `/processing` | `Processing.tsx` | Operational | Multi-pass OCR pipeline, Tesseract WASM execution, barcode cross-check, deterministic rules evaluation, vision fallback trigger |
| `/results` | `Results.tsx` | Operational | Overall compliance verdict (`PASS` / `REVIEW`), statutory issue cards, field evidence citations, PDF/CSV export |
| `/report` | `Report.tsx` | Operational | Single report inspection view and submission to authority |
| `/history` | `History.tsx` | Operational | Local IndexedDB report browser, sync queue status, search, verdict filters |
| `/history/:id` | `ReportDetail.tsx` | Operational | Detailed historical report view with field breakdowns and PDF/CSV export |
| `/authority` | `AuthorityDashboard.tsx` | Operational | Live vs Demo data toggle, surveillance KPI cards, category breakdown, issue distribution, audit report export |
| `/rules` | `Rules.tsx` | Operational | Searchable Legal Metrology statutory rule reference library |

---

## 2. Confirmed Working Capabilities vs Technical Debt

### Confirmed Capabilities (Verified by Tests):
- **113 / 113 Frontend Tests Passing:**
  - 107 core unit tests (`tests/unit_tests.ts`): Rule 6(1)(a)-(da) evaluations, barcode isolation, date sanity, adversarial inputs.
  - 4 export tests (`tests/export_tests.ts`): CSV formula injection mitigation (`=`, `+`, `-`, `@`), Gazette citations, multilingual Unicode rendering, multi-page vector PDF generation.
  - 2 vision fallback tests (`tests/vision_fallback_test.ts`): quality gate triggering and safe rule engine synthesis.
- **29 / 29 Backend Tests Passing:**
  - Relational database transactions and pooling (`tests/test_database.py`).
  - Report deduplication and query pagination (`tests/test_report.py`).
  - Market surveillance analytics and Zero-PII verification (`tests/test_analytics.py`).
  - Vision extraction payload validation and 8MB boundary (`tests/test_vision.py`).

### Technical Debt & UI Inconsistencies:
1. **Component Primitives Lack Unification:** Modals and buttons are created ad-hoc with inline Tailwind classes instead of standard, accessible primitives (Radix UI / shadcn patterns).
2. **Dashboard Visual Hierarchy:** The Authority Dashboard cards present data effectively, but would benefit greatly from Aceternity Bento Grid layouts, Spotlight focus states, and smooth metric transitions.
3. **Scan Viewfinder Feedback:** The camera capture UI lacks animated alignment reticles and real-time guidance overlays.
4. **Motion System:** Existing animations rely solely on basic CSS transitions and one WebGL ripple script (`ogl`). Adopting Framer Motion / Motion for React will provide fluid, accessible page and card entrance animations.
5. **Radix Accessibility Primitives:** Elements like tabs, tooltips, dialogs, and dropdowns should adhere to WAI-ARIA standards with full keyboard navigation and focus trapping.

---

## 3. Compatibility & Migration Assessment: Vite vs Next.js

### Evaluation Criteria:
1. **Offline PWA & Tesseract WASM:**
   - In Vite, `tesseract.js` WASM workers and local 5MB `.traineddata` files run entirely client-side without SSR hydration mismatches or node-worker bundling errors.
   - In Next.js App Router, SSR can cause hydration mismatches when interacting with browser-only WASM memory and local service workers unless every inspection component is strictly wrapped in `"use client"` with dynamic imports (`ssr: false`).
2. **Compatibility with shadcn/ui:**
   - shadcn/ui officially supports Vite + React! It uses standard Tailwind CSS, Radix UI primitives, Lucide icons, and `lib/utils.ts` (`cn` helper).
3. **Compatibility with Aceternity UI:**
   - Aceternity UI components are built with Tailwind CSS and Motion (Framer Motion). They install directly into React + Vite projects with zero SSR complications.
4. **Architectural Recommendation:**
   - Follow **Phase E** of the master prompt: Retain the high-performance Vite + React 18 PWA core for client-side WASM OCR, offline IndexedDB sync, and camera pipelines, while fully integrating the official **shadcn/ui component architecture** and **Aceternity UI motion primitives** into `lmcc-web`. This achieves a 100% premium, motion-rich experience without introducing SSR hydration breakage to client-side WASM and PWA workers.
