# Ontology Mapper (Rosetta)

Client-side web app for learning Semantic Web tech (OWL/RDF/SPARQL/SHACL) in the context of NATO defense interoperability. No backend.

## Code Exploration

Use claude-mem smart tools as the primary tools for understanding code. They save 8-19x tokens compared to Read/Grep and provide cross-session memory that prevents re-discovering what was already learned:

- `smart_outline` over `Read` — see file structure without loading the full file (~1,500 tokens vs ~12,000)
- `smart_unfold` over `Read` with offset/limit — read a specific function by name
- `smart_search` over `Grep` and `Glob` — AST-aware symbol search across the codebase
- `search` / `get_observations` — recall decisions, gotchas, and patterns from prior sessions
- `timeline` — understand recent work in a specific area before starting new tasks

Fall back to `Read` only when you need the full file for editing. Fall back to `Grep`/`Glob` only when smart tools return no results.

## Tech Stack

React 19, TypeScript 5.9, Vite 8, Tailwind CSS 4, shadcn/ui (preset: bcivVKZU), Zustand 5, React Flow (@xyflow/react 12), N3.js 2, Comunica, jsonld 9, rdf-validate-shacl 0.6, CodeMirror 6, YASGUI, idb-keyval 6, react-joyride 3

## Library Versions & API Notes

Always check actual installed versions before using library docs — training data may reflect an older major version.

| Library       | Version | Key gotcha                                                                                                                                      |
| ------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| react-joyride | 3.0.2   | Use `skipBeacon` (not `disableBeacon` — v2 API, silently ignored in v3). TypeScript types may omit it; extend with `& { skipBeacon?: boolean }` |
| tailwindcss   | 4.2.2   | CSS-first config — no `tailwind.config.js`. All v3 JS-config docs are wrong. Utilities and theme tokens work differently                        |
| zustand       | 5.0.12  | `subscribeWithSelector` middleware API changed in v5; vanilla store creation uses `createStore` not `create`                                    |
| react         | 19.2.4  | React 19, not 18. StrictMode double-invokes effects in dev. `use()` hook available                                                              |
| @xyflow/react | 12.10.2 | Package renamed from `reactflow` — imports are `@xyflow/react`, not `reactflow`                                                                 |
| vite          | 8.0.5   | v8 config API; check vite docs for current plugin and build options                                                                             |

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
- react-joyride v3 uses `skipBeacon: true` per step (not `disableBeacon` — that was v2 and is silently ignored); joyride shows beacon by default until target element is in DOM
