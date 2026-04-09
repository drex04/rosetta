# Architecture

**Analysis Date:** 2026-04-09

## Pattern Overview
**Overall:** Zustand-based flux with React Flow canvas and N3.js RDF processing. Client-side only (no backend).

**Key Characteristics:**
- Unidirectional flow: components → hooks → stores → lib utilities
- `lib/` is pure (no React/store imports) — testable in isolation
- Bidirectional canvas↔editor sync guarded by `isUpdatingFromEditor` flag to prevent circular updates
- IDB persistence via `idb-keyval`; type-guarded hydration on mount

## Layers

**Presentation (React):**
- Purpose: Render UI — canvas, panels, dialogs, layout
- Contains: Components in `src/components/` (canvas, nodes, edges, panels, layout, ui, onboarding)
- Location: `src/components/`
- Depends on: Zustand stores, hooks, React Flow, shadcn/ui
- Used by: App.tsx tree

**State (Zustand):**
- Purpose: Domain data and actions — six independent stores
- Contains: ontologyStore, sourcesStore, mappingStore, validationStore, uiStore, fusionStore
- Location: `src/store/`
- Depends on: lib utilities, types
- Used by: Components via `useXStore()` hooks, hooks, App.tsx

**Effects (Hooks):**
- Purpose: Connect React lifecycle to stores — side effects, persistence, bidirectional sync
- Contains: useAutoSave, useOntologySync, useSourceSync, useCanvasData, useKeyboardShortcuts, useInvalidateMappings
- Location: `src/hooks/`
- Depends on: stores, lib
- Used by: App.tsx, RightPanel, OntologyCanvas

**Utilities (Pure Lib):**
- Purpose: Stateless RDF/SPARQL/SHACL processing, format detection, mapping execution
- Contains: rdf.ts (N3 wrapper), rml.ts, shacl/ (validation/generation), parseOntologyFile.ts, jsonToSchema.ts, xmlToSchema.ts, yarrrml.ts, detectFormat.ts
- Location: `src/lib/`
- Depends on: N3, Comunica, rdf-validate-shacl, jsonld
- Used by: Stores, hooks

## Data Flow

**Ontology Edit (Code → Canvas):**
1. User edits Turtle in TurtleEditorPanel
2. Calls `onEditorChange()` → `useOntologySync()` parses via `src/lib/rdf.ts`
3. Updates `ontologyStore.nodes`, `ontologyStore.edges`, sets `isUpdatingFromEditor = true`
4. Canvas re-renders, guarded by flag (prevents serializing back immediately)

**Ontology Edit (Canvas → Code):**
1. Canvas fires `onCanvasChange()` with new nodes/edges
2. App.tsx checks `hasPendingEdits.current` — shows confirm dialog if editor unsaved
3. Calls `useOntologySync().onCanvasChange()` → serializes to Turtle
4. Updates `ontologyStore.turtleSource`, editor refreshes

**Source Upload & Mapping:**
1. User uploads JSON/XML/RDF in SourcePanel
2. `useSourceSync()` detects format via `detectFormat.ts`, generates schema
3. Updates `sourcesStore.sources[id]` with instance quads
4. User creates mappings in MappingPanel → `mappingStore.addMapping()`
5. `subscribeValidationToMappings()` auto-validates
6. `subscribeFusionToMappings()` marks fusion stale
7. User runs fusion → `fusionStore.runFusion()` calls `executeAllRml()` → outputs RDF graph

**State Persistence:**
1. `useAutoSave()` on mount restores IDB snapshot to all stores via `hydrate()` actions
2. Subscribers snapshot on every state change
3. Type guards validate shape before restoring (check `Array.isArray()`, property existence, etc.)

## Key Abstractions

**OntologyNode / OntologyEdge:**
- Purpose: RDF class/property graph on canvas
- Location: `src/types/index.ts`
- Pattern: Mirrors React Flow node/edge format

**Mapping:**
- Purpose: Link source field to target ontology property
- Location: `src/store/mappingStore.ts`, `src/types/index.ts`
- Pattern: Stored by sourceId; supports groups for multi-step transforms

**Source:**
- Purpose: External data instance (JSON/XML/RDF)
- Location: `src/store/sourcesStore.ts`
- Pattern: Holds instance quads in N3.Store, metadata (uri prefix, format, schema)

**FusionResult:**
- Purpose: RML execution output (new RDF graph + optional JSON-LD)
- Location: `src/lib/rmlExecute.ts`
- Pattern: { quads: Quad[], jsonLd?: object }

## Entry Points

**main.tsx:**
- Vite browser entry point
- Renders React root with ReactFlowProvider
- Calls `subscribeFusionToMappings()` to connect mappings → fusion updates

**App.tsx:**
- Mounts all hooks (useAutoSave, useOntologySync, useSourceSync, useKeyboardShortcuts, useInvalidateMappings)
- Wires canvas, panels, dialogs
- Handles canvas↔editor confirm dialog logic

**AppLayout.tsx:**
- Header + children layout
- About dialog toggle on first visit

## Cross-Cutting Concerns

**Logging:** Console.error for critical failures; Toaster (Sonner) for user-facing errors.

**Validation:** SHACL via `rdf-validate-shacl` in validationStore; RML validates source class/prop exists before fusion.

**Persistence:** IDB key 'rosetta-project'. useAutoSave snapshots on every store change. Type guards in hydration: check `typeof x === 'string'`, `Array.isArray()`, etc. hydrate() actions reset stale pointers (e.g., selectedMappingId → null).

**Circular Updates:** `isUpdatingFromEditor` flag in ontologyStore. When parsing Turtle, flag prevents serializing canvas back immediately. User must choose: keep editor or apply canvas edits (ConfirmDialog).

---
*Architecture analysis: 2026-04-09*
