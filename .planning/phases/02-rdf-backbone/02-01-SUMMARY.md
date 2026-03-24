---
phase: 02-rdf-backbone
plan: 01
subsystem: rdf
tags: []
provides:
  - "parseTurtle: Turtle string → OntologyNode[] + OntologyEdge[]"
  - "canvasToTurtle: canvas nodes/edges → Turtle string (round-trip)"
  - "ClassNode: blue-header canvas node with per-property Handle rows"
  - "SubclassEdge + ObjectPropertyEdge: typed custom edge components"
  - "OntologyCanvas: registered nodeTypes/edgeTypes, draggable nodes"
  - "Seed NATO ontology loaded on first render"
affects:
  - "02-02: bidirectional sync hook reads parseTurtle/canvasToTurtle"
  - "02-03: SHACL/SPARQL validators consume OntologyNode/ClassData"
tech-stack:
  added:
    - "n3 (Turtle parse/serialize via N3.Parser, N3.Writer, N3.Store)"
    - "vite-plugin-node-polyfills (Node built-ins for browser)"
    - "@types/n3"
  patterns:
    - "OntologyNode = Node<ClassData & Record<string,unknown>, 'classNode'>"
    - "Deterministic node IDs: node_{localName(uri)}"
    - "Edge IDs: e_{sourceId}_{type}_{targetId}"
    - "loadTurtle action: parse + simple horizontal layout (x=80+i*260)"
key-files:
  created:
    - "src/types/index.ts"
    - "src/lib/rdf.ts"
    - "src/__tests__/rdf.test.ts"
    - "src/components/nodes/ClassNode.tsx"
    - "src/components/edges/SubclassEdge.tsx"
    - "src/components/edges/ObjectPropertyEdge.tsx"
  modified:
    - "src/components/canvas/OntologyCanvas.tsx"
    - "src/store/ontologyStore.ts"
    - "src/App.tsx"
    - "vite.config.ts"
    - "tsconfig.app.json"
key-decisions:
  - "ClassData & Record<string,unknown> intersection satisfies @xyflow/react Node<> generic constraint without polluting interface with index signature"
  - "N3.Term type mismatch resolved with targeted as-unknown casts — N3.js v1 types lag @rdfjs/types v2 additions (id, toJSON)"
  - "tsconfig.app.json excludes src/__tests__ so app build stays clean; Vitest runs its own type check"
  - "loadTurtle applies simple horizontal layout (x=80+i*260, y=80) to avoid all nodes overlapping at 0,0"
patterns-established:
  - "Separation: parseTurtle positions nodes at {x:0,y:0}; callers (loadTurtle) apply layout"
  - "OntologyCanvas onNodesChange applies changes to masterNodes only; source nodes wired in later phase"
duration: ~2 hours
completed: 2026-03-24
requirements-completed:
  - REQ-09
  - REQ-13
  - REQ-14
---

# Phase 02-01: N3.js RDF layer, ClassNode/Edge components, OntologyCanvas registration

**Turtle parse→canvas round-trip with typed ClassNode/edge components; OntologyCanvas renders draggable master ontology graph from seed NATO Turtle on first load.**

## Performance
- **Duration:** ~2 hours
- **Tests:** 36 passing (21 new rdf tests; 2 pre-existing suites broken by missing @testing-library/dom)
- **Files created:** 6 | **Files modified:** 5
- **Build:** `npm run build` clean (599 kB bundle)

## Accomplishments
- `parseTurtle(text)` converts Turtle to typed `OntologyNode[]` + `OntologyEdge[]` via N3.js Parser/Store
- `canvasToTurtle(nodes, edges)` serializes canvas back to Turtle (round-trip verified by test)
- `localName(uri)` helper extracts local name after `#` or last `/`; falls back to full URI
- `ClassNode`: blue `bg-master` header with Phosphor `GraphIcon`, top/bottom handles, per-property right handles (`id="prop_{label}"`)
- `SubclassEdge`: dashed blue `BaseEdge` with "subClassOf" label and arrow marker
- `ObjectPropertyEdge`: solid blue `BaseEdge` labeled with `data.label`
- `OntologyCanvas` registers `nodeTypes`/`edgeTypes`, enables `nodesDraggable`, wires `onNodesChange → setNodes`
- `ontologyStore.loadTurtle()` action: parse + horizontal layout + atomic state update
- Seed NATO Track/AirTrack ontology loaded via `useEffect` in `App.tsx`

## Task Commits
| Task | Commit | Key Files |
|------|--------|-----------|
| Task 1: Tests (TDD red) | `3b895a2` | `src/__tests__/rdf.test.ts` |
| Task 1: Implementation (TDD green) | `e3611be` | `src/lib/rdf.ts`, `src/types/index.ts`, `vite.config.ts`, `ontologyStore.ts` |
| Task 2: ClassNode | `f6da6bd` | `src/components/nodes/ClassNode.tsx` |
| Task 2: Edge components | `46b83b7` | `SubclassEdge.tsx`, `ObjectPropertyEdge.tsx` |
| Task 2: Canvas registration + seed | `01b36e4` | `OntologyCanvas.tsx`, `App.tsx`, `ontologyStore.ts` |
| Fix: Record<string,unknown> constraint | `4f4578a` | `src/types/index.ts`, `OntologyCanvas.tsx`, test files |
| Fix: tsc build errors + unused import | `b74e397` | `src/lib/rdf.ts`, edge components, `tsconfig.app.json` |

## Decisions & Deviations

**Type intersection approach:** `OntologyNode = Node<ClassData & Record<string,unknown>, 'classNode'>` chosen over adding index signatures to `ClassData`. Keeps interface clean and searchable; downstream code accesses typed fields directly.

**N3 Term cast:** `N3.DataFactory.namedNode(uri) as unknown as N3.Term` used in `store.match()` calls. N3.js v1 types predate `id`/`toJSON` in @rdfjs/types v2. Functionally correct; cast is localized.

**Rule 1 - Bug:** Added `MarkerType.ArrowClosed` to edges in `rdf.ts` — `BaseEdge` needs `markerEnd` to render arrowheads.

**Rule 1 - Bug:** Horizontal layout applied in `loadTurtle` (not `parseTurtle`) to preserve test assertion `position: {x:0, y:0}`.

## Issues Encountered

`vite-plugin-node-polyfills@0.25.0` has peer dep cap at Vite 7; project uses Vite 8. Installed with `--legacy-peer-deps`. Global shims (`process`, `Buffer`, `global`) disabled in `vite.config.ts` to avoid rolldown/Vite 8 incompatibility. N3.js parses correctly without them.

Pre-existing: `smoke.test.tsx` and `useCanvasData.test.ts` fail with `Cannot find module '@testing-library/dom'` — unrelated to this plan.

## Self-Check

PASSED — `npx tsc --noEmit` exits 0, `npm run build` succeeds, 36/36 tests pass.

## Next Phase Readiness

**02-02 (Bidirectional sync):** `parseTurtle` and `canvasToTurtle` exports ready. `ontologyStore.turtleSource` writable. `loadTurtle` action exists.

**02-03 (SPARQL/SHACL):** `OntologyNode.data.properties[]` contains typed `PropertyData[]`; `ClassData.uri` available for SPARQL queries.
