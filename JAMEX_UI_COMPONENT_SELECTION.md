# JAMEx / LMCC — UI Component Selection Matrix & Integration Plan

**Document ID:** `JAMEX_UI_COMPONENT_SELECTION`  
**Application:** JAMEx / LMCC — Legal Metrology Compliance Checker  
**Core Framework:** shadcn/ui (Accessible Primitives) + Aceternity UI (Motion & Visual Effects) + Framer Motion  

---

## 1. Unified Component Selection Matrix

| Component Name | Source / Registry | Category | JAMEx-LMCC Usage | Priority | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`cn` Utility** | shadcn / `@/lib/utils` | Core Utility | Class variance merging with `clsx` and `tailwind-merge` | **P0** | **Adopt** |
| **`Button`** | shadcn/ui (`cva`) | Primitive Action | Primary scan CTA, camera trigger, PDF/CSV export buttons | **P0** | **Adopt** |
| **`Badge`** | shadcn/ui (`cva`) | Status Indicator | Verdict badges (`PASS`, `REVIEW`), Gazette rule tags, OCR quality | **P0** | **Adopt** |
| **`Card`** | shadcn/ui | Container | Statutory declaration cards, issue breakdown, report summary | **P0** | **Adopt** |
| **`Progress`** | shadcn/ui (`@radix-ui`) | Feedback | Live multi-stage OCR progress bar and confidence metrics | **P0** | **Adopt** |
| **`BentoGrid`** | Aceternity UI | Motion Surface | Authority Dashboard 4-panel surveillance metrics & trend overview | **P0** | **Adopt** |
| **`Spotlight`** | Aceternity UI | Ambient Motion | Focused radial illumination on hero scanning cards and KPI highlights | **P0** | **Adopt** |
| **`BackgroundBeams`** | Aceternity UI | Ambient Motion | Restrained dark backdrop for landing and dashboard pages | **P1** | **Adopt** |
| **`Dialog`** | shadcn/ui (`@radix-ui`) | Modal Overlay | "How It Works" legal walkthrough and evidence inspection modal | **P1** | **Adopt** |
| **`Tabs`** | shadcn/ui (`@radix-ui`) | Layout Navigation | History filtering (All, Compliant, Review Required, Offline Queue) | **P1** | **Adopt** |
| **`Tooltip`** | shadcn/ui (`@radix-ui`) | Accessible Hint | Statutory Gazette explanations, date format rules, unit rules | **P1** | **Adopt** |
| **`TextGenerate`** | Aceternity UI | Typography Reveal | Word-by-word entrance for hero title and executive audit headers | **P2** | **Adopt** |

---

## 2. Motion & Accessibility Constraints

1. **Deterministic Motion Rules:**
   - Every animation must respect `prefers-reduced-motion: reduce`.
   - Never animate high-frequency streaming OCR numbers or table rows continuously.
   - Avoid nesting heavy CSS `backdrop-filter: blur(...)` over SVG canvas animations to protect frame rates on mobile devices.
2. **Accessible Form & Modal Controls:**
   - All dialogs must have proper ARIA attributes, focus trapping, and `Escape` key listeners.
   - Statuses must never rely solely on color: every `PASS` (green) or `REVIEW` (amber) status carries an explicit text label and icon.
