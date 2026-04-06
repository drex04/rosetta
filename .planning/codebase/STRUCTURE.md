# Codebase Structure

**Analysis Date:** 2026-04-06

## Directory Layout
```
rosetta/
├── src/
│   ├── App.tsx                  # Root component — wires hooks, layout, sync
│   ├── main.tsx                 # Vite entry point
│   ├── components/
│   │   ├── canvas/              # React Flow canvas + context menus
│   │   ├── edges/               # Custom edge types (subclass, object property, mapping)
│   │   ├── layout/              # Shell chrome: AppLayout, Header, RightPanel, SourceSelector
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
│   └── fixtures.ts              # freshPage fixture (IDB clear + load)
└── public/                      # Static assets (favicon, etc.)
```

## Directory Purposes

**`src/components/canvas/`:**
- Purpose: React Flow graph rendering and interaction
- Key files: `OntologyCanvas.tsx`, context menu components

**`src/components/layout/`:**
- Purpose: App shell — header, resizable right panel, source tab selector, status bar
- Key files: `AppLayout.tsx`, `RightPanel.tsx`, `SourceSelector.tsx`
- Note: `RightPanel` has three layout modes (collapsed strip, mobile overlay, desktop resizable)

**`src/components/panels/`:**
- Purpose: Tab content rendered inside RightPanel
- Key files: `MappingPanel.tsx`, `TurtleEditorPanel.tsx`, `ValidationPanel.tsx`, `OutputPanel.tsx`, `SourcePanel.tsx`

**`src/store/`:**
- Purpose: All application state — one Zustand file per domain
- Key files: `ontologyStore.ts`, `mappingStore.ts`, `sourcesStore.ts`, `fusionStore.ts`, `validationStore.ts`, `uiStore.ts`

**`src/lib/`:**
- Purpose: Pure stateless utilities — no React, no store imports
- Key files: `rdf.ts` (N3 parse/serialize + `localName`), `rml.ts`, `yarrrml.ts`, `rmlExecute.ts`, `shacl/`, `jsonToSchema.ts`, `xmlToSchema.ts`, `formulaParser.ts`, `parseOntologyFile.ts`

**`src/hooks/`:**
- Purpose: Side-effect bridges between React lifecycle, stores, and lib
- Key files: `useOntologySync.ts`, `useSourceSync.ts`, `useAutoSave.ts`, `useInvalidateMappings.ts`

**`src/types/`:**
- Purpose: Shared TypeScript interfaces (nodes, edges, mappings, sources)
- Key files: `index.ts`

**`src/__tests__/`:**
- Purpose: Vitest unit tests — RDF round-trips, SPARQL CONSTRUCT, JSON→RDFS
- Pattern: Mirror `src/lib/` structure

**`e2e/`:**
- Purpose: Playwright browser tests
- Key files: `fixtures.ts` (use `freshPage` fixture for all layout/interaction tests)

## Key File Locations
**Entry Point:** `src/main.tsx` → `src/App.tsx`
**Vite Config:** `vite.config.ts`
**Tailwind Config:** `tailwind.config.js`
**TypeScript Config:** `tsconfig.json`
**Core RDF Utilities:** `src/lib/rdf.ts`
**Canvas Root:** `src/components/canvas/OntologyCanvas.tsx`
**IDB Persistence:** `src/hooks/useAutoSave.ts`
**Tests (unit):** `src/__tests__/`
**Tests (e2e):** `e2e/`

## Naming Conventions
**Components:** PascalCase, feature-suffixed — `MappingPanel.tsx`, `ClassNode.tsx`
**Stores:** camelCase with `Store` suffix — `ontologyStore.ts`, `mappingStore.ts`
**Hooks:** camelCase with `use` prefix — `useOntologySync.ts`
**Lib utilities:** camelCase, noun or verb — `rdf.ts`, `parseOntologyFile.ts`, `formulaParser.ts`
**Types:** PascalCase interfaces in `src/types/index.ts`

## Where to Add New Code
**New panel tab:** `src/components/panels/[Name]Panel.tsx`; register in `src/components/layout/RightPanel.tsx`
**New canvas node type:** `src/components/nodes/[Name]Node.tsx`; register in `OntologyCanvas.tsx`
**New store domain:** `src/store/[domain]Store.ts`; add IDB persistence via `useAutoSave.ts`
**New RDF/format utility:** `src/lib/[name].ts` (keep pure — no React/store imports)
**New hook:** `src/hooks/use[Name].ts`
**New shared type:** `src/types/index.ts`
**New unit test:** `src/__tests__/[name].test.ts`
**New e2e test:** `e2e/[name].spec.ts` using `freshPage` fixture

---
*Structure analysis: 2026-04-06*
