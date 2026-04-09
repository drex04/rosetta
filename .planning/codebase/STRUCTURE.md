# Codebase Structure

**Analysis Date:** 2026-04-09

## Directory Layout
```
src/
├── components/          # React components
│   ├── canvas/         # OntologyCanvas, context menus
│   ├── nodes/          # ClassNode, SourceNode
│   ├── edges/          # SubclassEdge, ObjectPropertyEdge, MappingEdge
│   ├── panels/         # Turtle, Source, Mapping, Output, Validation (lazy)
│   ├── layout/         # AppLayout, Header, RightPanel, SourceSelector
│   ├── ui/             # shadcn/ui + custom (alert, tooltip, tabs)
│   ├── onboarding/     # TourProvider, AboutDialog
│   └── ErrorBoundary.tsx
├── store/              # Zustand stores (one domain per file)
├── lib/                # Pure utilities (RDF, SPARQL, SHACL, format converters)
│   └── shacl/          # SHACL validation, generation, CONSTRUCT
├── hooks/              # Custom React hooks
├── types/              # TypeScript interfaces
├── data/               # Sample ontology, project bundle
├── assets/             # Icons, logos
├── __tests__/          # Vitest unit tests
├── App.tsx             # Root component
├── main.tsx            # Vite entry, ReactFlowProvider
└── index.css           # Tailwind imports
```

## Directory Purposes

**components/:** React component tree. Lazy-load heavy panels (Mapping, Output, Validation) in RightPanel with Suspense.

**store/:** Zustand stores. Each file exports `useXStore` hook. Stores are Singletons accessible via hooks or `useXStore.getState()` in actions.

**lib/:** Pure functions, no React imports. N3.js is primary RDF lib. Comunica runs SPARQL in-browser against N3.Store instances.

**hooks/:** Custom React hooks that coordinate stores and side effects. useAutoSave handles IDB snapshot/restore with type guards.

**types/:** Shared TypeScript types (OntologyNode, OntologyEdge, Mapping, Source, FusionResult).

**data/:** seed-ontology.ttl (imported raw), exampleProject.ts for demo bundle.

**__tests__/:** Vitest unit tests in `src/__tests__/` directory.

## Key File Locations

| Component                    | Path                                     |
|------------------------------|------------------------------------------|
| React entry                  | `src/main.tsx`                          |
| App root                     | `src/App.tsx`                           |
| Canvas component             | `src/components/canvas/OntologyCanvas.tsx` |
| Ontology state               | `src/store/ontologyStore.ts`            |
| Mappings state               | `src/store/mappingStore.ts`             |
| Sources state                | `src/store/sourcesStore.ts`             |
| RDF utilities                | `src/lib/rdf.ts`                        |
| RML execution                | `src/lib/rmlExecute.ts`                 |
| SHACL validation             | `src/lib/shacl/validator.ts`            |
| Format detection             | `src/lib/detectFormat.ts`               |
| IDB persistence              | `src/hooks/useAutoSave.ts`              |
| Canvas↔editor sync           | `src/hooks/useOntologySync.ts`          |
| Right panel (tabs)           | `src/components/layout/RightPanel.tsx`  |

## Naming Conventions

**Components:** PascalCase, `[Feature]Panel.tsx`, `[Type]Node.tsx`, `[Type]Edge.tsx`. Lazy import panels: `.then((m) => ({ default: m.PanelName }))`.

**Stores:** `useXStore` from `src/store/xStore.ts`. e.g., `useOntologyStore()`, `useMappingStore()`.

**Hooks:** `useXxx.ts` in `src/hooks/`. e.g., `useAutoSave`, `useOntologySync`.

**Lib utilities:** camelCase filenames, named exports. e.g., `rdf.ts` exports `parseTurtle`, `serializeTurtle`, `localName`.

**Types:** PascalCase interfaces in `src/types/index.ts`.

**Constants:** UPPER_SNAKE_CASE in defining module.

## Where to Add New Code

| Task                        | Location                                |
|-----------------------------|----------------------------------------|
| New panel tab               | `src/components/panels/XyzPanel.tsx` + lazy import in RightPanel |
| New canvas node type        | `src/components/nodes/XyzNode.tsx` + register in OntologyCanvas |
| New canvas edge type        | `src/components/edges/XyzEdge.tsx` + register in OntologyCanvas |
| New store domain            | `src/store/xyzStore.ts`, export `useXyzStore` hook |
| New RDF utility             | `src/lib/xyz.ts` (keep pure) or `src/lib/shacl/xyz.ts` |
| New hook                    | `src/hooks/useXyz.ts`                   |
| New UI component            | `src/components/ui/xyz.tsx`             |
| Unit test (Vitest)          | `src/__tests__/xyz.test.ts`             |
| E2E test (Playwright)       | `e2e/xyz.spec.ts`                       |
| Type definition             | Add to `src/types/index.ts`             |

---
*Structure analysis: 2026-04-09*
