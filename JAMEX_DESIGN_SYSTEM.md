# JAMEx / LMCC — Design System & Interaction Tokens

**Document ID:** `JAMEX_DESIGN_SYSTEM`  
**Application:** JAMEx / LMCC — Legal Metrology Compliance Checker  

---

## 1. Color Palette & Semantic Meaning

JAMEx / LMCC employs an institutional, dark-mode luxury design language tailored for regulatory authorities, field inspectors, and packaging compliance engineers.

```
+--------------------------------------------------------------------------+
|  OBSIDIAN BACKGROUNDS                                                    |
|  Base Canvas:       #06080e  (Deep Obsidian Void)                        |
|  Surface Card:      #0c101d  (Dark Slate with 70% opacity & fine border) |
|  Elevated Card:     #131a2e  (Hover state & active inspection frames)    |
|  Border Hairline:   rgba(255, 255, 255, 0.08)                            |
+--------------------------------------------------------------------------+
|  ACCENTS & LIGHTING                                                      |
|  Electric Violet:   #8b5cf6  (Hero glows, interactive focus, AI badges)  |
|  Sky Cyan:          #06b6d4  (Telemetry charts, date filter tags)        |
|  Saffron Accent:    #f59e0b  (Official SIH / Indian tricolor accent)     |
+--------------------------------------------------------------------------+
|  COMPLIANCE STATUS COLOR SYSTEM                                          |
|  COMPLIANT (PASS):  #10b981  (Emerald green: statutory declarations OK)  |
|  REVIEW REQUIRED:   #f59e0b  (Amber: missing declaration / OCR blur)     |
|  VIOLATION:         #ef4444  (Crimson: post-dated MFD, product clash)    |
|  INFORMATIONAL:     #3b82f6  (Cobalt blue: barcode lookup, metadata)     |
+--------------------------------------------------------------------------+
```

---

## 2. Typography Scale

- **Display & Headings:** `Newsreader`, Georgia, serif (for institutional elegance on authority headings and legal certificates).
- **Interface & UI:** `Plus Jakarta Sans`, Inter, -apple-system, sans-serif (high legibility at small sizes for inspection metadata).
- **Code & Legal Identifiers:** `JetBrains Mono`, monospace (for Gazette rule numbers `Rule 6(1)(da)`, barcodes, PIN codes).

---

## 3. Motion Tokens & Physics

- **Duration Scales:**
  - Micro-interactions (hover, focus, button clicks): `150ms - 200ms` (ease-out)
  - Layout transitions (tabs, panel reveals): `300ms` (spring physics `stiffness: 300, damping: 25`)
  - Page & Card Entrances: `400ms - 600ms` (staggered delay `0.05s`)
  - Ambient Lighting Drift (Spotlight & Beams): `6s - 10s` (continuous smooth loop)
- **Reduced Motion:**
  - When `prefers-reduced-motion` is detected, opacity changes immediately (`duration: 0.01ms`) and spatial translations (`x`, `y`, `scale`) are disabled.
