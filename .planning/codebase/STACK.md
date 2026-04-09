# Technology Stack

**Analysis Date:** 2026-04-09

## Languages
**Primary:** TypeScript ~5.9.3 — all application code in `src/`
**Secondary:** CSS — Tailwind utility classes, minimal custom CSS

## Runtime
**Environment:** Browser (client-side only, no Node.js server)
**Package Manager:** npm (package-lock.json present)

## Frameworks
**Core:** React 19.2.4 — UI rendering, component model
**Canvas:** @xyflow/react 12.10.2 — interactive ontology mapping canvas
**State:** Zustand 5.0.12 — stores in `src/store/` (ontology, sources, mappings, ui)
**Testing:** Vitest 4.1.2 + Playwright 1.58.2 — unit in `src/__tests__/`, E2E in `e2e/`
**Build/Dev:** Vite 8.0.5 with `@vitejs/plugin-react` 6.0.1 — HMR dev server, production build

## Key Dependencies
**Critical:** n3 2.0.3 — all RDF parsing/serialization; use `src/lib/rdf.ts` helpers, never raw N3 directly
**Critical:** rdf-validate-shacl 0.6.5 — in-browser SHACL validation against N3.Store
**Critical:** @comake/rmlmapper-js 0.5.2 — RML-based JSON→RDF mapping engine
**Critical:** jsonld 9.0.0 — JSON-LD framing and compaction; requires Node polyfills
**Infrastructure:** idb-keyval 6.2.2 — IndexedDB persistence; all stores auto-save via `useAutoSave`
**UI:** shadcn/ui (Radix UI primitives) + @phosphor-icons/react 2.1.10 — preset bcivVKZU
**Editor:** codemirror 6.0.2 + codemirror-lang-turtle 0.0.2 — Turtle/JSON/XML editors in panels
**XPath:** fontoxpath 3.34.0 — XPath evaluation for XML source mapping
**Toasts:** sonner 2.0.7 — notification toasts
**Onboarding:** react-joyride 3.0.2 — product tour; use `skipBeacon: true` (not v2 API)

## Configuration
**Build:** `vite.config.ts` at `/home/ubuntu/dev/rosetta/vite.config.ts` — manual chunk splitting for panels/vendors
**TypeScript:** `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`
**Linting:** ESLint 9 flat config + Prettier 3.8.1; husky + lint-staged on commit
**Testing:** `vitest.config.ts` — jsdom environment, v8 coverage at 70% threshold

## Platform Requirements
**Development:** Node.js (any modern LTS); `npm run dev` for Vite on port 3000
**Production:** Static file hosting (no server required); build output in `dist/`
**E2E Tests:** Chromium only — `npx playwright test` (Linux ARM64; Chrome unavailable)

---
*Stack analysis: 2026-04-09*
