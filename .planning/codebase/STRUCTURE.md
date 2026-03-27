# Codebase Structure

**Analysis Date:** 2026-03-27

## Directory Layout

```
rosetta/
├── src/
│   ├── components/           # React components (UI layer)
│   │   ├── canvas/          # OntologyCanvas (React Flow integration)
│   │   ├── edges/           # Edge renderers (SubclassEdge, ObjectPropertyEdge, MappingEdge)
│   │   ├── layout/          # Layout shell (Header, RightPanel, SourceSelector, StatusBar)
│   │   ├── nodes/           # Node renderers (ClassNode, SourceNode)
│   │   ├── panels/          # Right panel tabs (TurtleEditorPanel, SourcePanel, MappingPanel, OutputPanel)
│   │   └── ui/              # shadcn/ui primitives (button, dialog, tabs, dropdown-menu, alert)
│   ├── store/               # Zustand stores (state layer)
│   │   ├── ontologyStore.ts # Master RDF ontology (turtleSource, nodes, edges, parseError)
│   │   ├── sourcesStore.ts  # JSON schema sources (indexed by ID)
│   │   ├── mappingStore.ts  # Property mappings (indexed by sourceId)
│   │   └── uiStore.ts       # UI state (activeRightTab)
│   ├── hooks/               # Custom React hooks (sync & persistence layer)
│   │   ├── useOntologySync.ts  # Bidirectional editor↔canvas sync with debounce
│   │   ├── useAutoSave.ts      # IDB persistence and restore
│   │   └── useCanvasData.ts    # Merge ontology + source nodes/edges
│   ├── lib/                 # RDF processing & utilities (RDF processing layer)
│   │   ├── rdf.ts           # parseTurtle, canvasToTurtle, localName, tree layout
│   │   ├── sparql.ts        # SPARQL CONSTRUCT generation for mappings
│   │   ├── jsonToSchema.ts  # JSON → RDF schema conversion
│   │   ├── layout.ts        # applyTreeLayout for canvas positioning
│   │   ├── utils.ts         # General utilities
│   │   └── codemirror-theme.ts # CodeMirror theming
│   ├── types/               # TypeScript types
│   │   └── index.ts         # ClassData, PropertyData, OntologyNode, Mapping, ProjectFile
│   ├── __tests__/           # Vitest test files
│   ├── assets/              # SVG/image assets
│   ├── data/                # Embedded project data (if any)
│   ├── App.tsx              # Root component layout
│   ├── main.tsx             # Entry point (bootstrap)
│   └── index.css            # Global styles (Tailwind setup)
├── e2e/                     # Playwright end-to-end tests
│   ├── fixtures.ts          # Playwright fixtures (freshPage)
│   └── *.spec.ts            # Test specs (ontology, sources, mappings, etc.)
├── public/                  # Static assets (favicon, index.html)
├── .planning/               # Project planning & documentation
│   └── codebase/           # Codebase analysis docs (ARCHITECTURE.md, STRUCTURE.md, etc.)
├── vite.config.ts          # Vite bundler config
├── tsconfig.json           # TypeScript compiler config
├── tailwind.config.js      # Tailwind CSS config
├── eslint.config.mjs       # ESLint rules
├── playwright.config.ts    # Playwright test config
├── package.json            # Dependencies and scripts
└── index.html              # HTML entry point
```

## Directory Purposes

**src/components:**
- Purpose: All React UI code — visual hierarchy, interactivity, form inputs
- Contains: React Flow canvas, node/edge custom renderers, layout shell, panels, shadcn/ui wrapper components
- Key files: `canvas/OntologyCanvas.tsx` (graph view), `layout/RightPanel.tsx` (multi-tab editor/panel), `panels/TurtleEditorPanel.tsx` (editor integration)

**src/store:**
- Purpose: Zustand stores — centralized state management
- Contains: Four independent state trees with getter/setter actions
- Key files: `ontologyStore.ts` (primary RDF state), `mappingStore.ts` (idempotent mapping insert)

**src/hooks:**
- Purpose: Stateful logic for sync, persistence, and canvas data aggregation
- Contains: Custom React hooks using store subscriptions and refs for circular-update guards
- Key files: `useOntologySync.ts` (700 lines, complex bidirectional sync), `useAutoSave.ts` (150 lines, IDB persistence)

**src/lib:**
- Purpose: Stateless RDF/graph utilities
- Contains: N3.js integrations, SPARQL generation, JSON→RDF conversion, tree layout
- Key files: `rdf.ts` (350 lines, core Turtle parsing/serialization), `jsonToSchema.ts` (280 lines, JSON→N3 conversion)

**src/types:**
- Purpose: TypeScript type definitions
- Contains: ClassData, PropertyData, OntologyNode, SourceNode, Mapping, ProjectFile
- Key files: `index.ts` (single file, ~60 lines)

**src/__tests__:**
- Purpose: Vitest unit tests
- Contains: Tests for RDF round-trips, SPARQL generation, JSON→schema conversion, store operations
- Key files: `rdf.test.ts`, `jsonToSchema.test.ts`, `store.test.ts`, `mappingStore.test.ts`

**e2e/:**
- Purpose: Playwright end-to-end tests for UI interactions
- Contains: Full app layout tests, canvas interaction tests, source/mapping workflows
- Key files: `fixtures.ts` (freshPage helper), `*.spec.ts` (test suites)

**.planning/codebase/:**
- Purpose: GSD codebase analysis documents
- Contains: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, CONCERNS.md
- Consumed by: `plan-phase` and `execute-phase` orchestrators

## Key File Locations

**Entry Points:**
- `src/main.tsx`: Bootstrap React, mount App into #root
- `src/App.tsx`: Root component layout (Header, canvas, RightPanel)
- `public/index.html`: HTML shell with root div

**Configuration:**
- `vite.config.ts`: Bundler setup (React plugin, node polyfills)
- `tsconfig.json`: TypeScript target (ES2020), paths (@ → src/)
- `tailwind.config.js`: Tailwind setup (content paths, theme)
- `eslint.config.mjs`: ESLint rules (React hooks, refresh)
- `playwright.config.ts`: E2E test config (baseURL, headless)

**Core Logic:**
- `src/lib/rdf.ts`: Turtle parsing, N3 quad handling, tree layout
- `src/lib/jsonToSchema.ts`: JSON object → RDF class/property extraction
- `src/lib/sparql.ts`: SPARQL CONSTRUCT template generation
- `src/hooks/useOntologySync.ts`: Bidirectional sync with debouncing and guards
- `src/store/ontologyStore.ts`: Master ontology state (turtleSource, nodes, edges)
- `src/store/mappingStore.ts`: Mapping storage with idempotent insert

**Testing:**
- `src/__tests__/rdf.test.ts`: Round-trip Turtle parsing/serialization
- `src/__tests__/jsonToSchema.test.ts`: JSON→RDF schema conversion
- `e2e/fixtures.ts`: Playwright freshPage fixture (IDB clear + load)
- `e2e/ontology.spec.ts`: Canvas interaction tests

## Naming Conventions

**Files:**
- React components: PascalCase (e.g., `ClassNode.tsx`, `TurtleEditorPanel.tsx`)
- Utilities/functions: camelCase (e.g., `useOntologySync.ts`, `jsonToSchema.ts`)
- Config files: kebab-case or .config.js pattern (e.g., `vite.config.ts`, `eslint.config.mjs`)
- Tests: `*.test.ts` (Vitest) or `*.spec.ts` (Playwright)

**Directories:**
- Feature groups: plural (e.g., `components`, `hooks`, `types`)
- Semantic grouping: singular (e.g., `store`, `lib`, `data`)

**Functions:**
- Custom hooks: `useX` (e.g., `useOntologySync`, `useAutoSave`)
- Utility functions: camelCase (e.g., `parseTurtle()`, `canvasToTurtle()`, `localName()`)
- React components: PascalCase (e.g., `ClassNode()`, `RightPanel()`)

**Variables:**
- Store selectors: camelCase with getter name (e.g., `const { nodes, edges } = useOntologyStore(s => ...)`
- Refs: camelCase ending in `Ref` (e.g., `debounceTimer`, `isUpdatingFromCanvas`)
- Constants: UPPER_SNAKE_CASE (e.g., `COLUMN_X_MASTER`, `IDB_KEY`)

**Types:**
- Interfaces: PascalCase (e.g., `ClassData`, `PropertyData`, `Mapping`, `OntologyState`)
- Type unions: PascalCase (e.g., `OntologyNode`, `OntologyEdge`)
- Data types: PascalCase (e.g., `SaveStatus = 'idle' | 'saving' | 'saved' | 'error'`)

## Where to Add New Code

**New Feature (e.g., SHACL validation):**
- Primary code: `src/lib/shacl-validate.ts` (RDF processing logic)
- Panel UI: `src/components/panels/ValidationPanel.tsx` (new tab in RightPanel)
- Store state: `src/store/validationStore.ts` (if stateful)
- Tests: `src/__tests__/shacl-validate.test.ts` + `e2e/validation.spec.ts`
- Register panel in `src/components/layout/RightPanel.tsx` tabs

**New Component/Module:**
- Reusable component: `src/components/{category}/{ComponentName}.tsx`
- Custom hook: `src/hooks/use{FeatureName}.ts`
- Utility lib: `src/lib/{featureName}.ts`
- Zustand store (if needed): `src/store/{featureName}Store.ts`

**Utilities:**
- Shared RDF helpers: `src/lib/rdf.ts` (add alongside existing parseTurtle, canvasToTurtle)
- General utilities: `src/lib/utils.ts` (non-RDF helper functions)
- Type helpers: Add to `src/types/index.ts` or create `src/types/{feature}.ts`

**Tests:**
- Unit tests: `src/__tests__/{feature}.test.ts` (same name as file being tested)
- Integration tests: `src/__tests__/{feature}.test.ts` (test store + hook together)
- E2E tests: `e2e/{feature}.spec.ts` (full app interaction)

## Special Directories

**src/data:**
- Purpose: Embedded seed data (sample projects, NATO air defense scenario)
- Generated: No
- Committed: Yes (JSON/Turtle files bundled with app)

**dist/, build/**
- Purpose: Output directory for production build artifacts
- Generated: Yes (npm run build)
- Committed: No

**node_modules/:**
- Purpose: npm dependencies
- Generated: Yes (npm install)
- Committed: No

**.planning/codebase/:**
- Purpose: Auto-generated codebase analysis (this directory)
- Generated: Yes (map-codebase orchestrator)
- Committed: Yes (documents guide future work)

**e2e/, playwright-report/**
- Purpose: E2E test suite and results
- Generated: e2e/ committed, playwright-report/ not committed
- Committed: Tests committed, reports not

## Path Aliases

**tsconfig.json paths:**
- `@/*` → `src/*` (import { foo } from '@/lib/rdf')

## Import Organization

**Order (enforced by eslint):**
1. React/browser APIs (react, @xyflow/react, @radix-ui/*)
2. N3.js and RDF libraries
3. Zustand stores
4. Local lib/ utilities
5. Local components and hooks
6. Local types
7. CSS/static imports

**Example:**
```typescript
import { useCallback, useEffect } from 'react'
import { ReactFlow, Controls } from '@xyflow/react'
import * as N3 from 'n3'
import { useOntologyStore } from '@/store/ontologyStore'
import { parseTurtle, localName } from '@/lib/rdf'
import { ClassNode } from '@/components/nodes/ClassNode'
import type { OntologyNode } from '@/types/index'
```

---

*Structure analysis: 2026-03-27*
