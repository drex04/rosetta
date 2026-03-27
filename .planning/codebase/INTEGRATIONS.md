# External Integrations

**Analysis Date:** 2026-03-27

## APIs & External Services

**None Currently Active**
- Application is entirely client-side and offline-capable
- No network calls to external APIs
- No third-party service integrations

## Data Storage

**Databases:**
- IndexedDB (browser-native)
  - Key: `'rosetta-project'`
  - Storage: Project file (ontology, sources, mappings, node positions, active source ID, timestamp)
  - Client: idb-keyval 6.2.2 (`import { get, set } from 'idb-keyval'`)
  - Location: `src/hooks/useAutoSave.ts` (load on mount, save on debounced change)

**File Storage:**
- Local filesystem only — no cloud storage
- Files downloaded via browser's native download API (Turtle/RDF export)
- Files uploaded via browser's native file input

**Caching:**
- None (stateless on reload; project restored from IndexedDB)

## In-Memory Data Structures

**RDF Triple Store:**
- N3.js Store — in-memory triple store created during app runtime
- No persistence layer beyond IndexedDB project file
- Used for: Class/property graph, ontology visualization, mappings

## Authentication & Identity

**Auth Provider:**
- Custom (OAuth/auth not applicable — client-side only)
- No user identification needed
- No login/logout

**Access Control:**
- Not applicable (single-user, browser-local)

## Monitoring & Observability

**Error Tracking:**
- None configured
- Errors logged to browser console only

**Logs:**
- Browser console (via `console.warn()`, `console.error()`)
- Example error patterns:
  - `"rosetta: restored invalid Turtle from IDB"` — Turtle parse failure during project restore
  - `"[useAutoSave] IDB write failed"` — IndexedDB persistence failure

## CI/CD & Deployment

**Hosting:**
- Static hosting (GitHub Pages, Netlify, Vercel, or any HTTP server)
- Build artifact: `dist/` directory
- No server-side runtime needed

**CI Pipeline:**
- GitHub Actions (configured in `.github/workflows/`)
- Runs: `npm run build` (TypeScript check + Vite production build)
- Runs: `npm run lint` (ESLint)
- Runs: `npm run test` (Vitest)
- Runs: `npm run test:e2e` (Playwright, requires dev server at http://localhost:3000)

## Environment Configuration

**Required env vars:**
- None — application is fully self-contained

**Build-time config:**
- All static; no runtime environment variables needed
- Vite build: `vite.config.ts` defines base path (`./`), dev server port (3000), aliases

**Secrets location:**
- Not applicable — no authentication or secrets needed

## Planned (CLAUDE.md Roadmap)

**SPARQL Query Engine:**
- Comunica - In-browser SPARQL query engine
  - Purpose: Execute SPARQL CONSTRUCT queries against N3.Store
  - Status: Not yet installed (planned for future phase)
  - Integration point: `src/lib/sparql.ts` (already has `generateConstruct()` helper)

**SHACL Validation:**
- rdf-validate-shacl - SHACL shape validation
  - Purpose: Validate RDF graphs against SHACL shapes
  - Status: Not yet installed (planned for 05-shacl-validation phase per `.planning/phases/05-shacl-validation/`)
  - Integration approach: Shapes generated from ontology; validation pipeline to validate source data

**SPARQL Editor UI:**
- YASGUI - Yet Another SPARQL GUI
  - Purpose: Interactive SPARQL query editor
  - Status: Not yet installed (planned for future)
  - Integration point: Would replace or supplement CodeMirror in TurtleEditorPanel for query mode

**User Onboarding:**
- react-joyride - Guided tour/tutorial
  - Purpose: Interactive feature walkthrough
  - Status: Not yet installed (planned for future UX enhancement)
  - Integration point: Would wrap around canvas, panels, and key buttons

## Webhooks & Callbacks

**Incoming:**
- None (no server-side backend)

**Outgoing:**
- None (no external system integration)

## Import Patterns & Data Exchange

**RDF Import:**
- File upload (browser's native `<input type="file">`)
- Format: Turtle (`.ttl`) via N3.js parser
- Flow: User uploads → `parseTurtle()` → `useOntologyStore.loadTurtle()`
- Location: `src/lib/rdf.ts` (`parseTurtle()` function)

**JSON-LD Import/Export:**
- jsonld 9.0.0 library available
- Used for JSON-LD processing (frame/flatten operations)
- Location: `src/types/index.ts` and store files may import jsonld

**Export:**
- Turtle format via N3.js Writer
- JSON-LD via jsonld library
- Download via browser's native download API

## Browser APIs Used

**IndexedDB:**
- Project persistence (ontology, sources, mappings, positions)
- Wrapper: idb-keyval 6.2.2

**Blob/File API:**
- RDF/Turtle file export

**Canvas API:**
- React Flow (@xyflow/react) uses Canvas for graph rendering

**DOM Events:**
- beforeunload event to prevent accidental close while saving (used in `useAutoSave.ts`)

---

*Integration audit: 2026-03-27*
