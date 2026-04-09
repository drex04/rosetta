# External Integrations

**Analysis Date:** 2026-04-09

## APIs & External Services
None. All processing is in-browser. No HTTP calls to external APIs at runtime.

Comunica runs SPARQL queries against an in-memory N3.Store — no SPARQL endpoint.
jsonld context resolution uses bundled/inline contexts — no network fetches at runtime.

## Data Storage
**Databases:** IndexedDB via `idb-keyval` 6.2.2 — persists all four Zustand stores (ontology, sources, mappings, ui) in `src/store/`
**File Storage:** Local filesystem only — users import/export RDF files via browser file picker
**Caching:** None (beyond IndexedDB persistence)

## Authentication & Identity
None — client-only app, no user accounts or sessions.

## Monitoring & Observability
**Error Tracking:** None
**Analytics:** None
**Logging:** Console only (sonner toasts for user-facing errors)

## CI/CD & Deployment
**Hosting:** Static file host — build output in `dist/` via `npm run build`
**CI Pipeline:** None detected (no `.github/workflows/` present)
**Build Command:** `tsc -b && vite build` (TypeScript + Vite production bundle)

## Environment Configuration
**Development:** No required env vars — run `npm run dev` directly
**Production:** No secrets; deploy `dist/` to any static host (GitHub Pages, Netlify, etc.)

---
*Integration audit: 2026-04-09*
