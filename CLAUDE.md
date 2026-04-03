# Ontology Mapper (Rosetta)

Client-side web app for learning Semantic Web tech (OWL/RDF/SPARQL/SHACL) in the context of NATO defense interoperability. No backend.

## Tech Stack

React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui (preset: bcivVKZU), Zustand, React Flow (@xyflow/react), N3.js, Comunica, jsonld, rdf-validate-shacl, CodeMirror 6, YASGUI, idb-keyval, react-joyride

## Commands

| Command         | Description      |
| --------------- | ---------------- |
| `npm run dev`   | Start dev server |
| `npm run build` | Production build |
| `npm run test`  | Run tests        |
| `npm run lint`  | Lint/format      |

## Architecture

```
src/
  components/    # React components (nodes/, edges/, panels/, ui/)
  store/         # Zustand stores (ontology, sources, mappings, ui)
  lib/           # RDF utils, SPARQL engine, SHACL validator, JSON→RDF
  hooks/         # Custom React hooks
  types/         # TypeScript types
  data/          # Sample project bundle (NATO air defense scenario)
```

## Code Style

- All RDF processing via N3.js; SPARQL queries via Comunica; SHACL via rdf-validate-shacl
- Canvas color semantics: amber=source nodes, blue=master ontology, dashed-green=mapping edges — never break these
- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`
- Stage files individually, never `git add .`
- Default text size is `text-sm`; default shadcn Button size is `size="sm"`

## Testing

- Vitest in `src/__tests__/`
- Test RDF round-trips, SPARQL CONSTRUCT outputs, and JSON→RDFS conversion logic
- Run `npm run build` (not just `npm run test`) to catch TypeScript errors — LSP diagnostics lag after file changes
- E2E tests live in `e2e/` — run with `npx playwright test`, NOT via `npm run test` (vitest picks them up but fails without dev server)
- Playwright fixture `freshPage` in `e2e/fixtures.ts` handles IDB clear + page load; use it for all layout/interaction tests

## Planning

Project state tracked in `.planning/`. Run `/fh:resume-work` to check status.
Design tokens and aesthetic direction in `.planning/DESIGN.md`.

## Gotchas

- Root layout uses `h-dvh` (not `h-screen`) for iOS Safari address-bar compatibility (Tailwind 3.4+)
- RightPanel has three layout modes: collapsed strip (`w-10`), mobile full-width overlay (`z-20`), desktop resizable (`shrink-0` + inline width); breakpoint is `window.innerWidth < 640`
- Bidirectional canvas↔code sync needs an `isUpdatingFrom*` flag to prevent circular updates
- Comunica runs in-browser against N3.Store — no server needed, but large datasets are slow
- Each source gets its own URI prefix (derived from source name) — never share prefixes between sources
- shadcn/ui init must use `--preset bcivVKZU`; icon library must be Phosphor (override any preset default)
- IDB persistence pattern for each store: subscribe → snapshot in `useAutoSave` → mount restore with type guard → `setSaveStatus('error')` on failure
- Type guards for IDB data must validate element shape (e.g. `typeof m.id === 'string'`), not just `Array.isArray`
- `hydrate` actions must reset related selection state (e.g. `selectedMappingId: null`) to prevent stale pointers after reload
- Always import `localName` from `src/lib/rdf.ts` — never re-implement; divergence silently breaks handle matching
- Playwright MCP must use `chromium` (not `chrome`) — this is a Linux ARM64 host where Chrome is unavailable
