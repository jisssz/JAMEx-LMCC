# JAMEx / LMCC — Frontend Architecture Specification

**Document ID:** `JAMEX_FRONTEND_ARCHITECTURE`  
**Application:** JAMEx / LMCC — Legal Metrology Compliance Checker  
**Stack:** React 18 / TypeScript / Tailwind CSS / Radix UI / Aceternity UI / Framer Motion / Vite PWA  

---

## 1. Architectural Principles & Boundaries

1. **Client-Side WASM & Offline Resiliency:**
   - Legal Metrology inspections often occur in basements, warehouses, port customs areas, and wholesale markets with zero cellular connectivity.
   - `tesseract.js` WASM workers, Indian language models (`eng`, `hin`, `tam`, `mal`), and `ZXing` barcode scanning run entirely in-browser.
   - Local IndexedDB (`localReports.ts`) provides instantaneous local persistence and an idempotent background sync queue (`reportSync.ts`).

2. **Unified UI Foundation (shadcn/ui + Aceternity UI):**
   - **shadcn/ui Primitives:** Serve as the rock-solid, accessible foundation (WAI-ARIA compliant dialogs, tabs, dropdowns, badges, buttons, cards, tooltips).
   - **Aceternity UI Motion Primitives:** Serve as the premium visual & interaction layer (Bento Grid cards, Spotlight focus elements, Background Beams, Glow effects, and smooth card reveals).
   - **Utility Core:** `src/lib/utils.ts` exporting standard `cn(...inputs: ClassValue[])` combining `clsx` and `tailwind-merge`.

3. **Deterministic Legal Metrology Engine:**
   - Visual enhancements or AI assistance **never** alter the deterministic validation of Rule 6(1).
   - The compliance status (`PASS` vs `REVIEW`) is governed by verified statutory logic with exact Gazette citations.

---

## 2. Directory Layout & Modular Structure

```
lmcc-web/
├── public/                 # Static assets, traineddata models, manifest
├── src/
│   ├── components/
│   │   ├── ui/             # Reusable shadcn/ui and Aceternity UI primitives
│   │   │   ├── button.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── tooltip.tsx
│   │   │   ├── progress.tsx
│   │   │   ├── bento-grid.tsx      # Aceternity Bento Grid
│   │   │   ├── spotlight.tsx       # Aceternity Spotlight
│   │   │   ├── background-beams.tsx # Aceternity Ambient Background
│   │   │   └── glow-button.tsx
│   │   ├── layout/         # Shell, navigation, headers
│   │   │   ├── AppHeader.tsx
│   │   │   └── Shell.tsx
│   │   ├── compliance/     # Legal Metrology specific widgets
│   │   │   ├── VerdictCard.tsx
│   │   │   └── ViolationCard.tsx
│   │   └── camera/         # Camera capture and quality gates
│   ├── lib/
│   │   └── utils.ts        # cn helper (clsx + tailwind-merge)
│   ├── pages/              # Routed pages
│   │   ├── Home.tsx
│   │   ├── Scan.tsx
│   │   ├── Processing.tsx
│   │   ├── Results.tsx
│   │   ├── AuthorityDashboard.tsx
│   │   ├── History.tsx
│   │   ├── ReportDetail.tsx
│   │   └── Rules.tsx
│   ├── services/           # Business logic, OCR, sync, API
│   └── tests/              # Automated verification suites
```

---

## 3. Design Tokens & Semantic Color System

- **Background Surfaces:**
  - Obsidian Base: `#06080e`
  - Charcoal Card Surface: `rgba(14, 19, 32, 0.70)`
  - Elevated Card Hover: `rgba(22, 29, 46, 0.85)`
  - Subtle Border Hairline: `rgba(255, 255, 255, 0.08)`
- **Accent & Interaction:**
  - Electric Violet: `#8b5cf6` (Glows, interactive focus)
  - Cyan Data Highlight: `#06b6d4` (Active filters, trends)
  - Emerald Green: `#10b981` (Compliant `PASS` findings)
  - Amber Warning: `#f59e0b` (Uncertainty, `REVIEW` required, missing declarations)
  - Rose Danger: `#f43f5e` (Direct statutory violations, product clashes)
