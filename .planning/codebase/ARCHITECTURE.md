# Architecture

**Analysis Date:** 2026-04-06

## Pattern Overview
**Overall:** Client-only layered SPA (no backend)
**Key Characteristics:**
- Unidirectional dependency: `components/` → `store/` → `lib/` → third-party RDF libs
- `lib/` is pure (zero React/store imports) — safe to unit test in isolation
- `hooks/` is the bridge layer: connects stores to React lifecycle and side effects
- All persistence is IndexedDB via `idb-keyval`; no network calls

## Layers

**UI Layer:**
- Purpose: Render and interact — canvas, panels, layout chrome
- Contains: React components, shadcn/ui primitives
- Location: `src/components/`
- Depends on: `store/`, `hooks/`, `types/`
- Used by: `src/App.tsx`

**State Layer:**
- Purpose: Domain state with actions; drives re-renders
- Contains: Zustand stores (one file per domain)
- Location: `src/store/`
- Depends on: `lib/`, `types/`
- Used by: `components/`, `hooks/`, `App.tsx`

**Hook Layer:**
- Purpose: Bidirectional canvas↔editor sync, IDB persistence, invalidation
- Contains: Custom React hooks
- Location: `src/hooks/`
- Depends on: `store/`, `lib/`
- Used by: `App.tsx`, panels

**Utility Layer:**
- Purpose: Pure RDF/SPARQL/SHACL processing, format conversion
- Contains: Stateless functions, parsers, validators
- Location: `src/lib/`
- Depends on: N3.js, Comunica, rdf-validate-shacl, jsonld
- Used by: `store/`, `hooks/`

## Data Flow

**Ontology Load (Turtle editor → canvas):**
1. User edits Turtle in `TurtleEditorPanel` → calls `onEditorChange` prop
2. `useOntologySync` in `src/hooks/useOntologySync.ts` parses via `src/lib/rdf.ts`
3. `ontologyStore` (`src/store/ontologyStore.ts`) updates nodes/edges state
4. `OntologyCanvas` re-renders React Flow graph; sync guarded by `isUpdatingFromEditor` flag

**Canvas → Turtle (canvas edit → code):**
1. `OntologyCanvas` fires `onCanvasChange` with new nodes/edges
2. `App.tsx` checks `hasPendingEdits` — shows confirm dialog if editor has unsaved changes
3. `useOntologySync.onCanvasChange` serializes to Turtle via `src/lib/rdf.ts`
4. `ontologyStore` and editor state both update

**Mapping → RML/YARRRML output:**
1. User creates mapping in `MappingPanel` → `mappingStore` (`src/store/mappingStore.ts`)
2. `fusionStore` (`src/store/fusionStore.ts`) watches mappings, calls `src/lib/rml.ts`
3. Output panels (`OutputPanel`) render generated RML/YARRRML/SPARQL

**Validation:**
1. `subscribeValidationToMappings()` in `src/store/validationStore.ts` auto-runs on mapping change
2. Calls `src/lib/shacl/` utilities against active N3.Store
3. Results surface in `ValidationPanel`

**State Management:** Zustand with IDB persistence via `useAutoSave` hook; each store subscribes independently. `hydrate` actions reset selection state to prevent stale pointers.

## Key Abstractions

**ontologyStore:**
- Purpose: Single source of truth for master OWL ontology (nodes, edges, Turtle text)
- Location: `src/store/ontologyStore.ts`
- Pattern: Singleton store

**mappingStore:**
- Purpose: Source-field → ontology-property mapping records (keyed by source)
- Location: `src/store/mappingStore.ts`
- Pattern: Singleton store

**lib/rdf.ts:**
- Purpose: All N3.js parsing/serialization; `localName` extractor (must always import from here)
- Location: `src/lib/rdf.ts`
- Pattern: Stateless utility module

**lib/shacl/:**
- Purpose: SHACL shape generation, instance extraction, validation runner, CONSTRUCT queries
- Location: `src/lib/shacl/`
- Pattern: Stateless sub-module

## Entry Points

**Application root:**
- Location: `src/main.tsx` → `src/App.tsx`
- Triggers: Vite dev server / browser load
- Responsibilities: Mount React tree, restore IDB state, wire sync hooks

## Cross-Cutting Concerns
**Logging:** Console only — no structured logging layer.
**Validation:** SHACL via `rdf-validate-shacl`; runs reactively on mapping changes.
**Persistence:** IDB via `idb-keyval`; `useAutoSave` subscribes to stores and snapshots on change; type guards validate shape before restore.

---
*Architecture analysis: 2026-04-06*
