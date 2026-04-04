# Codebase Reference

**Mapped:** 2026-04-04

## Structure — Where to Put New Code

### Directory Layout
```
rosetta/
├── src/
│   ├── App.tsx                  # Root component; wires hooks + layout
│   ├── main.tsx                 # Vite entry point
│   ├── components/
│   │   ├── canvas/              # React Flow canvas + context menus
│   │   ├── edges/               # Custom edge types (subclass, object property, mapping)
│   │   ├── layout/              # Shell chrome: Header, RightPanel, SourceSelector, StatusBar
│   │   ├── nodes/               # Custom node types (ClassNode, SourceNode)
│   │   ├── panels/              # Tab panel content (Mapping, Output, Source, Turtle, Validation)
│   │   └── ui/                  # shadcn/ui primitives + local overrides
│   ├── store/                   # Zustand stores (one file per domain)
│   ├── lib/                     # Pure RDF/SPARQL/SHACL utilities + format converters
│   │   └── shacl/               # SHACL sub-utilities (validator, shapes, instances, CONSTRUCT)
│   ├── hooks/                   # Custom React hooks (sync, persistence, invalidation)
│   ├── types/                   # Shared TypeScript interfaces and type aliases
│   ├── data/                    # Static seed data (NATO air defense scenario bundle)
│   └── __tests__/               # Vitest unit tests
├── e2e/                         # Playwright end-to-end tests
└── public/                      # Static assets
```

### Placement Rules
- **New feature UI component:** `src/components/panels/` (tab panel) or `src/components/canvas/` (canvas overlay)
- **New reusable primitive:** `src/components/ui/` (shadcn pattern — functional, no business logic)
- **New canvas node type:** `src/components/nodes/`
- **New canvas edge type:** `src/components/edges/`
- **New Zustand store:** `src/store/{domain}Store.ts`
- **New RDF/SPARQL/SHACL utility:** `src/lib/{utilityName}.ts`
- **New React hook:** `src/hooks/use{HookName}.ts`
- **New shared type:** `src/types/index.ts` (single barrel file)
- **New unit test:** `src/__tests__/{subject}.test.ts`
- **New E2E test:** `e2e/{subject}.spec.ts`

### Key Entry Points
- `src/main.tsx`: Vite mount point
- `src/App.tsx`: Root layout, hook wiring, canvas↔editor sync coordination
- `src/hooks/useAutoSave.ts`: IDB persistence — hydrates all stores on mount, debounced save on any store change
- `src/store/ontologyStore.ts`: Master ontology state (nodes, edges, turtleSource)

## Conventions — Which Patterns to Follow

### Naming
- **Files:** `camelCase.ts` / `PascalCase.tsx` for components
- **Components:** `PascalCase` named exports (no default exports from components)
- **Hooks:** `use` prefix, `camelCase` — e.g. `useAutoSave`, `useOntologySync`
- **Stores:** `use{Domain}Store` — e.g. `useOntologyStore`, `useMappingStore`
- **Event handlers (props):** `on` prefix — e.g. `onCanvasChange`, `onEditorChange`
- **Internal handlers:** `handle` prefix — e.g. `handleCanvasChange`
- **Types/Interfaces:** `PascalCase`, interfaces preferred over `type` for object shapes
- **Constants:** `SCREAMING_SNAKE_CASE` — e.g. `SEED_TURTLE`, `IDB_KEY`, `COLUMN_X_MASTER`

### Code Style
- **Formatting:** Prettier (enforced via lint); no trailing commas in function params
- **Imports:** Path alias `@/` maps to `src/`; type imports use `import type {}`; React hooks first, then stores, then lib, then types
- **Section dividers:** `// ─── Section Name ───...` comments to separate logical blocks within a file
- **Error handling:** `try/catch` with `console.warn` for recoverable IDB/parse failures; `setSaveStatus('error')` on persistence failure; `(e as Error)?.message` pattern for unknown errors
- **Async:** `void` prefix on floating promises; `async/await` inside `useEffect` via IIFE `void (async () => { ... })()`
- **Exports:** Named exports throughout; `export default` only in `App.tsx` and route-level files
- **Text size:** Default `text-sm`; shadcn Button default `size="sm"`

### Example Pattern — Zustand store
```typescript
// src/store/exampleStore.ts
import { create } from 'zustand';
import type { SomeType } from '@/types/index';

// ─── Store interface ──────────────────────────────────────────────────────────

interface ExampleState {
  items: SomeType[];
  setItems: (items: SomeType[]) => void;
  hydrate: (items: SomeType[]) => void;  // resets selection state too
  reset: () => void;
}

export const useExampleStore = create<ExampleState>((set) => ({
  items: [],
  setItems: (items) => set({ items }),
  hydrate: (items) => set({ items, selectedId: null }),
  reset: () => set({ items: [] }),
}));
```

### Canvas Color Semantics (never break)
- **Amber nodes:** source data nodes
- **Blue nodes:** master ontology nodes
- **Dashed green edges:** mapping edges

## Architecture — How Layers Connect

### Pattern Overview
**Client-only layered architecture** — no backend. All RDF processing in-browser via N3.js, SPARQL via Comunica against N3.Store, SHACL via rdf-validate-shacl.

### Layer Dependencies
```
components/ → store/ → lib/ → (N3, Comunica, rdf-validate-shacl)
hooks/      → store/ + lib/
components/ → hooks/
App.tsx     → components/ + hooks/ + store/
types/      ← imported by all layers (no outbound deps)
```
- `lib/` is pure — no store imports, no React
- `store/` imports from `lib/` only (never from `components/` or `hooks/`)
- `components/` reads store via hooks; writes via store actions
- `hooks/` may import multiple stores and lib utilities

### Data Flow

**Canvas ↔ Turtle Editor sync:**
1. User edits Turtle → `useOntologySync.onEditorChange` → `parseTurtle` (lib) → `ontologyStore.setNodes/setEdges`
2. User drags canvas → `OntologyCanvas.onCanvasChange` → `App.handleCanvasChange` → `useOntologySync.onCanvasChange` → serialize to Turtle → `ontologyStore.setTurtleSource`
3. Circular update prevention: `isUpdatingFromEditor` / `isUpdatingFromCanvas` ref flags in `useOntologySync`

**Persistence (IDB):**
1. Mount: `useAutoSave` reads `rosetta-project` key from IndexedDB → validates with type guards → hydrates all stores
2. Change: any store subscription fires → debounced 500ms → snapshot all stores → `idb-keyval.set`

**Mapping pipeline:**
1. Source schema parsed by `jsonToSchema` / `xmlToSchema` → `sourcesStore`
2. User draws mapping edge → `mappingStore` records `{sourceFieldUri, targetPropUri}`
3. `rml.ts` / `rmlExecute.ts` generate RML + execute transform → `fusionStore` holds output RDF

### State Management
- One Zustand store per domain: `ontologyStore`, `sourcesStore`, `mappingStore`, `validationStore`, `fusionStore`, `uiStore`
- Stores are subscribed to externally by `useAutoSave`; cross-store coordination in `App.tsx` or dedicated hooks
- `hydrate` actions always reset related selection state to prevent stale pointers after IDB restore

### Key Abstractions
- `localName(uri)` at `src/lib/rdf.ts`: extracts local name from any URI — always import this, never reimplement
- `parseTurtle(text)` at `src/lib/rdf.ts`: parses Turtle → `{ nodes, edges }` for the canvas
- `ProjectFile` at `src/types/index.ts`: the IDB snapshot shape (version, ontology, sources, mappings, groups)
- `useAutoSave` at `src/hooks/useAutoSave.ts`: single hook owns all IDB read/write; mount in `App.tsx` only
