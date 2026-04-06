# Codebase Concerns

**Analysis Date:** 2026-04-06

## Tech Debt

**OntologyCanvas god component:**
- Issue: `src/components/canvas/OntologyCanvas.tsx` (1102 lines) owns all canvas UI state, all store subscriptions, context menus, edge picker, group prompt, and node callbacks in one component.
- Files: `src/components/canvas/OntologyCanvas.tsx`
- Impact: Hard to test, slow to review; any canvas-related change risks unintended side effects.
- Fix approach: Extract context menus, edge picker dialog, and group prompt into sibling components with lifted state via `useReducer` or a local canvas UI store.

**Bidirectional canvas↔code sync:**
- Issue: Sync between CodeMirror Turtle editor and canvas requires `isUpdatingFrom*` guard flags to prevent circular store updates. Missing a flag in a new path silently causes infinite loops.
- Files: `src/components/panels/TurtleEditorPanel.tsx`, `src/store/ontologyStore.ts`
- Impact: Adding any new cross-panel sync without the guard breaks the app.
- Fix approach: Centralize sync logic into a single `useBidirectionalSync` hook with the guard encapsulated.

**`useAutoSave` fire-and-forget void:**
- Issue: Hydration in `useAutoSave.ts` calls `void parseTurtle(...)` inside a `.then()` — if the async chain throws after `hydratedRef.current = true`, the user's data may partially restore without an error banner.
- Files: `src/hooks/useAutoSave.ts` lines 81–98
- Impact: Silent partial hydration; user sees blank canvas with no error.
- Fix approach: Await `parseTurtle` inside the outer `async` body and propagate errors to `setSaveStatus('error')`.

## Known Fragile Areas

**RightPanel layout modes:**
- Why fragile: Three distinct CSS modes (collapsed strip `w-10`, mobile overlay `z-20`, desktop resizable) switch on `window.innerWidth < 640` checked imperatively — no reactive listener.
- File: `src/components/layout/RightPanel.tsx`
- Safe modification: Add a `useEffect` with `resize` listener if adding responsive behavior; do not add new conditional widths without testing all three modes.

**`localName` utility:**
- Why fragile: Handle matching in mapping edges depends on `localName` from `src/lib/rdf.ts`. If re-implemented elsewhere it silently breaks URI→handle resolution.
- File: `src/lib/rdf.ts`
- Safe modification: Always import from `src/lib/rdf.ts`; never inline a local version.

**Source URI prefix uniqueness:**
- Why fragile: Each source derives its URI prefix from source name. Duplicate source names produce identical prefixes, causing RDF triple collisions.
- File: `src/store/sourcesStore.ts`
- Safe modification: Enforce uniqueness in `addSource` — either block duplicate names or append a disambiguating suffix.

**IDB type guards:**
- Why fragile: `isValidMappings` / `isValidGroups` in `useAutoSave.ts` check only `id`, `strategy`, `targetClassUri`, `targetPropUri`. New required fields on `Mapping` or `MappingGroup` will silently pass guard and hydrate with `undefined` values.
- File: `src/hooks/useAutoSave.ts` lines 20–57
- Safe modification: Update both guards whenever fields are added to `Mapping` or `MappingGroup` in `src/types/index.ts`.

## Performance Bottlenecks

**Comunica in-browser SPARQL over large datasets:**
- Problem: Comunica runs SPARQL against an in-memory N3.Store. Large ontology files (e.g. C2SIM RDF files now in `src/data/`) will be slow — no streaming, no indexes beyond N3.
- Files: `src/lib/rdf.ts`, `src/data/C2SIM.rdf`, `src/data/C2SIM_LOX.rdf`, `src/data/C2SIM_SMX.rdf`
- Cause: N3.Store holds all triples in memory; Comunica iterates full store per query.

## Dead Code

**`ScrollBar` export:**
- Location: `src/components/ui/scroll-area.tsx` line 48
- Safe to remove: Yes — not imported anywhere; shadcn component export not used in this codebase.

**`RDF_TYPE` constant:**
- Location: `src/lib/shacl/constructExecutor.ts` line 8
- Safe to remove: Yes — local constant not referenced outside the file.

**`ShaclFactory` export:**
- Location: `src/lib/shacl/validator.ts` line 7
- Safe to remove: Yes — not imported elsewhere.

**`ParseResult` type:**
- Location: `src/lib/formulaParser.ts` line 13
- Safe to remove: Yes — exported type with no external consumers found.

**`@radix-ui/react-tooltip` dependency:**
- Location: `package.json`
- Safe to remove: Yes — not imported in source; likely a leftover from shadcn init.

## Test Coverage Gaps

**IDB hydration paths:**
- What's not tested: Partial restore failures (e.g. valid ontology + malformed mappings), and the `parseTurtle` error branch in `useAutoSave`.
- Risk: Silent data loss on IDB schema drift after a refactor.
- Priority: High

**Formula parser / group strategies:**
- What's not tested: `src/lib/formulaParser.ts` formula evaluation and MappingGroup strategy rendering (concat, template, formula) have no unit tests.
- Risk: Formula regression silently breaks CONSTRUCT output.
- Priority: High

**Canvas sync guard:**
- What's not tested: Bidirectional Turtle↔canvas sync under rapid edits; no test verifies the `isUpdatingFrom*` guard prevents loops.
- Risk: Circular update loops in new sync paths.
- Priority: Medium

---
*Concerns audit: 2026-04-06*
