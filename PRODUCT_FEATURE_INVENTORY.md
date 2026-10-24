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
| Rules library | `/rules` | Live | Static rules content | Frontend build |
| Authority analytics | `/authority-dashboard` | Demo by default; live toggle | Analytics API, with demo fallback | Existing frontend tests/build |
| Compliance copilot | Results panel | Provider-dependent with offline fallback | `/api/copilot/chat` when configured | `test:copilot` |
| Image enhancement workspace | `/image-enhancement`; scanner choice at `/scan` | Local deterministic processing; AI editing provider unavailable | Browser canvas; original retained | Frontend build; `test:image` |
| OCR input provenance | `/scan` → `/processing` | Per-panel original/enhanced selector; original default | Selection carried in panel state | Frontend build; manual flow |
| India jurisdiction browser | `/india-map` | State/UT selection and search; no fabricated counts | Boundary geometry and jurisdiction data unavailable | Frontend build; manual empty-state check |

## Known data and provider gaps

- No image-editing AI provider or credential is configured. Current enhancement is deterministic local contrast/sharpening only and is labelled accordingly.
- Inspection records do not currently include a verified state/UT jurisdiction field. The India map does not infer location from addresses or GPS.
- Licensed boundary geometry could not be fetched from this restricted environment. The map screen exposes a clear unavailable state instead of approximate borders.
- Authority analytics in demonstration mode are illustrative. Live mode depends on the configured backend and visibly falls back to demo data on failure.
