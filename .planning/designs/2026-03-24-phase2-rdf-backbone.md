---
created: 2026-03-24
phase: 02-rdf-backbone
type: design
status: approved
---

# Phase 2: RDF Backbone — Approved Design

## Goal
The master ontology goes from a static canvas stub to a live, editable RDF graph — fully round-trippable between the visual canvas and Turtle text, persisted automatically.

## Plan Split (3 plans)

### 02-01: RDF Foundation + Custom Nodes/Edges (REQ-09, REQ-13, REQ-14)
- Install N3.js + `vite-plugin-node-polyfills`
- `src/lib/rdf.ts` — parse/serialize Turtle, canvas↔Store conversion utilities
- `src/types/index.ts` — shared RDF/canvas types (OntologyNode, OntologyEdge, ClassData, PropertyData)
- `src/components/nodes/ClassNode.tsx` — blue header, URI display, expandable property list, handles
- `src/components/edges/SubclassEdge.tsx` + `ObjectPropertyEdge.tsx` — distinct visual styles
- Register custom types in `OntologyCanvas.tsx`
- Tests for `lib/rdf.ts`

### 02-02: Turtle Editor + Bidirectional Sync (REQ-10, REQ-11)
- Install `@codemirror/*` + `codemirror-lang-turtle`
- Add `ONTO` tab to right panel; tab order: `SRC | ONTO | MAP | OUT`
- `src/components/panels/TurtleEditorPanel.tsx` — CodeMirror 6 editor
- `src/hooks/useOntologySync.ts` — `isUpdatingFromCanvas` / `isUpdatingFromEditor` refs
- Canvas nodes draggable (position changes trigger canvas→Turtle)
- Tests for sync hook

### 02-03: Export + Persistence (REQ-12, REQ-15, REQ-16)
- Install `idb-keyval`
- `src/hooks/useAutoSave.ts` — Zustand subscribe + debounced idb-keyval
- Toolbar Export button → Turtle (.ttl) + JSON-LD (.jsonld) downloads
- `.onto-mapper.json` format: `{ version, nodes, edges, turtleSource, timestamp }`
- Import: file picker → hydrate stores
- Header save status indicator

## Locked Decisions

### Tab Order
`SRC | ONTO | MAP | OUT` — ONTO is second tab (master ontology Turtle editor).

### Edge Authoring
Turtle-text only in Phase 2. No drag-to-connect between canvas handles. Canvas is read-only for edge creation this phase — edges appear when Turtle is parsed.

### Export Formats
Turtle (.ttl) + JSON-LD (.jsonld) only. RDF/XML deferred (N3.js doesn't produce it natively).

### Canvas Interactivity (Phase 2 scope)
- Nodes: draggable to reposition (triggers canvas→Turtle)
- Edges: read-only on canvas (authored via Turtle editor)
- No inline property editing on node (Turtle is the editing surface)
