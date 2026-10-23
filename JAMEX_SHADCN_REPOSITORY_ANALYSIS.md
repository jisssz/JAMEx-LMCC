# shadcn/ui Repository Intelligence & Feature Extraction Analysis

**Target Project:** JAMEx / LMCC — Legal Metrology Compliance Checker  
**Reference Repository:** [`shadcn-ui/ui`](https://github.com/shadcn-ui/ui)  
**Analysis Date:** October 2026  
**License Check:** MIT License (Permissive Open Source)  

---

## 1. Repository Purpose, Architecture & Philosophy

`shadcn/ui` is not a traditional npm component library that is packaged and locked as a black-box dependency. Instead, it is an **open-code architecture** and CLI registry system that places component source code directly into your repository.

### Key Architectural Pillars:
1. **Unstyled Primitives (Radix UI):** Handles keyboard navigation, ARIA attributes, focus trapping, screen-reader announcements, and modal overlay semantics.
2. **Deterministic Class Merging (`cn`):** Uses `clsx` and `tailwind-merge` in `@/lib/utils.ts` to ensure custom utility classes override defaults predictably without CSS specificity conflicts.
3. **Class Variance Authority (`cva`):** Manages component variants (`default`, `secondary`, `destructive`, `outline`, `ghost`), sizes (`sm`, `md`, `lg`, `icon`), and compound variants cleanly in TypeScript.
4. **Zero-Vendor Lock-In:** You own the code. You can modify animation durations, colors, padding, and DOM nodes directly inside `@/components/ui/`.

---

## 2. Recommended shadcn/ui Component Categories for JAMEx / LMCC

| Category | Component | Purpose in JAMEx / LMCC | Priority |
| :--- | :--- | :--- | :--- |
| **Actions** | `Button` | High-contrast actions (Start Inspection, Upload Panel, Export PDF, Sync) | **P0** |
| **Indicators** | `Badge` | Compliance verdicts (`PASS`, `REVIEW`), gazette rule tags, and OCR confidence levels | **P0** |
| **Surfaces** | `Card` (Header, Title, Description, Content, Footer) | Statutory declaration cards, KPI telemetry, and multi-panel inspection frames | **P0** |
| **Feedback** | `Progress` | Deterministic OCR pipeline stages, multi-panel aggregation progress, and confidence bars | **P0** |
| **Overlays** | `Dialog` / `Sheet` | "How It Works" legal guide, inspection evidence inspector, and mobile panel drawer | **P1** |
| **Navigation** | `Tabs` | Switching between All Reports, Compliant (`PASS`), Pending Review, and Unsynced items | **P1** |
| **Information** | `Tooltip` | Rule explanation tooltips, Gazette citations, and data provenance disclosures | **P1** |
| **Forms** | `Input` & `Textarea` | Manual correction of extracted manufacturer, MRP, or date declarations | **P1** |
| **Layout** | `Separator` | Fine 1px divider lines between statutory declarations and authority metadata | **P2** |

---

## 3. Components Explicitly Rejected or Deferred

- **`Calendar` / `Date-Picker` (Deferred):** Legal metrology package dates use statutory Month/Year (`MM/YYYY` or `DD/MM/YYYY`) text strings rather than standard calendar schedulers.
- **`Sidebar` Complex Shell (Adapted):** A lightweight responsive header + mobile sheet navigation fits the quick-scan workflow better than a heavyweight nested sidebar.
- **`Carousel` (Rejected):** Multi-panel scanning benefits from direct 4-panel grid selection rather than horizontal carousels that hide missing panels.

---

## 4. Integration Strategy for JAMEx-LMCC

1. **Utility Setup:** Add `src/lib/utils.ts` exporting standard `cn(...)`.
2. **Install Core Primitives:** Add `@radix-ui/react-slot`, `@radix-ui/react-dialog`, `@radix-ui/react-tabs`, `@radix-ui/react-tooltip`, `@radix-ui/react-progress`, `class-variance-authority`, `clsx`, and `tailwind-merge`.
3. **Style Tokens:** Align shadcn's CSS variables with JAMEx-LMCC's obsidian dark theme palette.
