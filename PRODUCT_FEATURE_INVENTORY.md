# JAMEx-LMCC Product Feature Inventory

Status snapshot: 2026-10-24. “Working” means present in the repository and reachable through the UI; it does not imply statutory certification.

| Feature | Route / entry | UI state | Backend / data | Verification |
|---|---|---|---|---|
| Home / product overview | `/` | Live | Static product UI and sample studio | Frontend build |
| Camera capture and upload | `/scan` | Live | Browser device APIs; local files | `test:all`; manual browser flow |
| Multi-panel OCR | `/processing` | Live | Tesseract in browser | `test:all`; manual OCR flow |
| Deterministic rule screening | `/results` | Live | Local rules engine | `test:all` |
| Human review and reports | `/results`, `/report`, `/history/:id` | Live | Local report store and sync | `test:all` |
| History | `/history` | Live | Local report store | `test:all` |
| Report center | `/reports` | Live; saved server/on-device records, search/status filters, preview, PDF/CSV download, empty/offline states | Reporting API plus local report store | Frontend build; 127 frontend tests; production route smoke check |
| Rules library | `/rules` | Live | Static rules content | Frontend build |
| Authority analytics | `/authority-dashboard` | Demo by default; live toggle | Analytics API, with demo fallback | Existing frontend tests/build |
| Compliance copilot | Results panel | Provider-dependent with offline fallback | `/api/copilot/chat` when configured | `test:copilot` |
| AI vision cross-check | Results panel, shown for low-quality/incomplete OCR | User-initiated; returns separately labelled AI suggestions and disagreements; never changes report fields/verdict | `/api/extract/vision`, Gemini multimodal when configured | Backend provider contract tests; frontend build |
| Image enhancement workspace | `/image-enhancement`; scanner choice at `/scan` | Local deterministic processing; AI editing provider unavailable | Browser canvas; original retained | Frontend build; `test:image` |
| OCR input provenance | `/scan` → `/processing` | Per-panel original/enhanced selector; original default | Selection carried in panel state | Frontend build; manual flow |
| India compliance map | `/india-map` | Interactive 36-state/UT choropleth; search, state selection, category/severity/date filters, zoom/pan; synthetic records isolated in browser | Simplified 2024 LGD boundary features; fixed-seed synthetic demonstration records only | Frontend build; browser check confirmed state selection and filter recompute |

## Known data and provider gaps

- No image-editing AI provider or credential is configured. Current enhancement is deterministic local contrast/sharpening only and is labelled accordingly.
- Inspection records do not currently include a verified state/UT jurisdiction field. The India map remains demo-only and does not infer location from addresses or GPS.
- The backend Gemini vision endpoint uses a documented multimodal model when configured; mock extraction is explicit for local tests and blocked in production. The provider integration is contract-tested with a stub. A live production vision request returned HTTP 502, so production AI extraction is not confirmed. In Results, users must explicitly choose to send the original image to the backend. Returned values stay outside the report until a person verifies them.
- The public provider diagnostic now reports configuration only. It no longer probes models, makes billable requests, or returns key fragments.
- Authority analytics in demonstration mode are illustrative. Live mode depends on the configured backend and visibly falls back to demo data on failure.

## Verification for this update

- Frontend build passes; existing frontend suites pass: 127 tests.
- Backend suites pass: 59 tests.
- Manual browser check on local Vite verified map rendering, state selection, and category-filtered counts.
- The public production diagnostic now reports configuration only. Production Gemini vision extraction was separately invoked and returned HTTP 502; the failure cause remains unresolved.
- Production frontend routes `/image-enhancement`, `/india-map`, and the new `/reports` Report Center are reachable. Vercel deployment status after the latest Reports commit was not independently confirmed.
