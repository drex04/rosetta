# Codebase Reference

**Mapped:** 2026-03-31

## Structure — Where to Put New Code

### Directory Layout
```
src/
├── components/       # React components (canvas, nodes, edges, panels, layout, ui)
├── store/            # Zustand stores (ontology, sources, mappings, validation, ui)
├── lib/              # RDF processing, SPARQL, SHACL, JSON→RDF utilities
├── hooks/            # Custom React hooks (useAutoSave, useOntologySync, useCanvasData)
├── types/            # TypeScript interfaces (index.ts is the single source of truth)
├── data/             # Sample project bundles (NATO air defense scenario)
├── assets/           # Static assets (icons, images)
└── __tests__/        # Vitest unit tests
```

### Placement Rules
- **New canvas-related component:** `src/components/canvas/{FeatureName}.tsx`
- **New node type:** `src/components/nodes/{NodeType}.tsx` + register in `nodeTypes` object in `OntologyCanvas.tsx`
- **New edge type:** `src/components/edges/{EdgeType}.tsx` + register in `edgeTypes` object in `OntologyCanvas.tsx`
- **New panel/editor:** `src/components/panels/{PanelName}.tsx` + wire into `RightPanel.tsx` tabs
- **New Zustand store:** `src/store/{featureName}Store.ts` following the `create<StoreState>((set, get) => ({...}))` pattern
- **New RDF/SPARQL utility:** `src/lib/{feature}.ts` — use N3.js for parsing/writing, Comunica for SPARQL queries
- **New hook:** `src/hooks/use{HookName}.ts` — follow the pattern of `useAutoSave`, `useOntologySync`
- **New UI component:** `src/components/ui/{component-name}.tsx` — shadcn/ui preset is `bcivVKZU`, icons are Phosphor
- **Tests:** `src/__tests__/{moduleUnderTest}.test.ts{x}` — Vitest; E2E tests in `e2e/` with Playwright

### Key Entry Points
- `src/App.tsx`: Main app component, orchestrates Header, SourceSelector, OntologyCanvas, RightPanel
- `src/components/canvas/OntologyCanvas.tsx`: React Flow canvas, node/edge types, sync hooks
- `src/store/ontologyStore.ts`: Master ontology state (nodes, edges, Turtle source, parse errors)
- `src/store/mappingStore.ts`: Mappings indexed by sourceId; handles idempotent add (RD-04)
- `src/lib/rdf.ts`: RDF utilities — `localName()`, `prefixFromUri()`, `shortenUri()` — **never re-implement**
- `src/hooks/useAutoSave.ts`: IDB persistence pattern with type guards; restores on mount
- `src/hooks/useOntologySync.ts`: Bidirectional editor↔canvas sync with `isUpdatingFrom*` flags

## Conventions — Which Patterns to Follow

### Naming
- **Files:** `kebab-case.ts` for utilities, `PascalCase.tsx` for React components
- **Functions:** `camelCase`; event handlers prefix with `handle` (e.g., `handleCanvasChange`)
- **React hooks:** `use{FeatureName}` (e.g., `useAutoSave`, `useOntologySync`)
- **Zustand stores:** `use{Feature}Store` (e.g., `useOntologyStore`, `useMappingStore`)
- **Store getters:** `(s) => s.propertyName` — use selector shorthand
- **Zustand actions:** verb phrase (e.g., `addMapping`, `removeMapping`, `setSelectedMappingId`, `hydrate`)

### Code Style
- **Formatting:** ESLint + React hooks + TypeScript strict rules (no config for prettier)
- **Imports:** Path aliases via `@/*` (tsconfig baseUrl); group by: external, internal, types. Never re-implement `localName` — always import from `src/lib/rdf.ts` (RD-01)
- **Error handling:**
  - RDF parsing: try/catch → `setParseError()` → preserve raw Turtle in state
  - IDB restore: type guards validate element shape (e.g., `typeof m.id === 'string'`), not just `Array.isArray()`
  - Failed restores: `setSaveStatus('error')`, log to console, don't crash
- **Exports:** Named exports for utilities, default export for React components
- **Zustand state updates:** Immutable — spread objects (`...s`), filter/map arrays, never mutate
- **Circular sync prevention:** Use `isUpdatingFrom*` ref flags (e.g., `hasPendingEdits.current`)

### Example Pattern
```typescript
// src/lib/example.ts
import { localName, prefixFromUri } from './rdf'

export function derivePrefix(uri: string): string {
  return prefixFromUri(uri)
}

// src/store/exampleStore.ts
import { create } from 'zustand'

interface ExampleState {
  items: Record<string, Item[]>
  selectedId: string | null
  addItem: (item: Omit<Item, 'id'>) => string
  setSelectedId: (id: string | null) => void
  hydrate: (items: Record<string, Item[]>) => void
}

export const useExampleStore = create<ExampleState>((set, get) => ({
  items: {},
  selectedId: null,
  addItem: (item) => {
    const id = crypto.randomUUID()
    set((s) => ({
      items: { ...s.items, key: [...(s.items.key ?? []), { ...item, id }] }
    }))
    return id
  },
  setSelectedId: (id) => set({ selectedId: id }),
  hydrate: (items) => set({ items }),
}))
```

## Architecture — How Layers Connect

### Pattern Overview
**Modular canvas + polyglot RDF processing.**

React Flow manages node/edge placement; Zustand stores own all state; RDF lib handles N3.js/Comunica/SHACL independently; IDB persists via `useAutoSave`; sync hooks prevent circular updates.

### Layer Dependencies
```
UI Components (React Flow, shadcn/ui)
  ↓
Zustand Stores (ontology, sources, mappings, validation, ui)
  ↓
RDF Lib (N3.js, Comunica, SHACL)
  ↓
Data Serialization (Turtle, JSON→RDF)
```

- **React components** depend on: Zustand stores, custom hooks, lib utilities
- React components **NEVER** import from other components (except ui/ subcomponents)
- **Zustand stores** depend on: lib utilities, other stores (validation subscribes to mappings)
- Stores **NEVER** import React
- **lib/** is pure TypeScript — no React, no Zustand state (takes data as args)

### Data Flow

**Ontology Loading:**
1. User loads Turtle file → `OntologyCanvas` → `useOntologyStore.loadTurtle()`
2. `loadTurtle()` calls `parseTurtle()` (lib) → N3.js parses → extract classes/properties → update nodes/edges

**Mapping Creation:**
1. User connects canvas handles → `OntologyCanvas.onConnect()` → `addMapping()`
2. `addMapping()` checks idempotence (RD-04) → store mutation → validation triggered
3. Validation store auto-subscribes to mappings changes → reruns SHACL validation

**Persistence:**
1. `useAutoSave` subscribes to all stores on mount
2. On change, debounce 500ms → snapshot to IDB as `ProjectFile` (ontology + sources + mappings)
3. On reload, restore from IDB → parse Turtle → restore node positions → hydrate stores

**Bidirectional Sync (Editor ↔ Canvas):**
1. Editor change → `onEditorChange()` → `isUpdatingFromEditor.current = true` → `loadTurtle()` → parse
2. Canvas change → `onCanvasChange()` → if `hasPendingEdits.current`, queue update, else sync to Turtle source
3. Flags prevent infinite loops during paint

### State Management

- **Ontology:** `src/store/ontologyStore.ts` — Turtle source, nodes, edges, parse error
- **Sources:** `src/store/sourcesStore.ts` — RDF source files, URI prefixes
- **Mappings:** `src/store/mappingStore.ts` — transformations (direct, template, constant, typecast, language, join, SPARQL), indexed by sourceId
- **Validation:** `src/store/validationStore.ts` — SHACL validation reports, auto-triggered on mapping changes
- **UI:** `src/store/uiStore.ts` — active tabs, right panel collapsed state, highlighted canvas nodes
- **Persistence:** IDB key `rosetta-project` stores serialized `ProjectFile`

### Key Abstractions

- **ClassData** at `src/types/index.ts`: Core domain model — label, URI, prefix, properties (PropertyData[])
- **Mapping** at `src/types/index.ts`: Transformation rule — source+target class/prop, kind (direct/template/constant/typecast/language/join/sparql), kind-specific fields
- **Node handle IDs:** Canvas handle IDs encode property info (e.g., `prop_trackId`, `target_prop_identifier`). **Always store handles directly from connection event** (RD-02). Use `localName()` to extract property labels for display.
- **Canvas color semantics (never change):** Amber = source nodes, Blue = master ontology, dashed green = mapping edges
- **RDF constants:** All URIs use full namespace (http://...) in N3 Store; shortening (`owl:Class`) is display-only
