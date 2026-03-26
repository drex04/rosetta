# Phase 2: RDF Backbone — Locked Decisions

## Design Decisions

### D-01: Canvas Data Model — Classes and Properties
**Decision:** Properties are embedded in `ClassNode.data.properties[]` (not separate canvas nodes). Each property row renders a React Flow `<Handle>` with id `"prop_{localName}"` on the right side of the node.
**Why:** Separate PropertyNode canvas nodes would be extremely cluttered (N classes × M properties = hundreds of nodes). Handle rows give properties a connectable identity on canvas without the clutter. Phase 4 mapping edges connect `sourceHandle: "prop_lat"` → `targetHandle: "prop_LATITUDE"` using these handles.

### D-02: Canvas Data Model — Edges
**Decision:** Two edge types:
- `subclassEdge` — `rdfs:subClassOf` relations between classes (class-to-class)
- `objectPropertyEdge` — `owl:ObjectProperty` with cross-class domain/range (class-to-class, labeled with property name)
- `DatatypeProperty` (xsd:*) stays embedded in the class node's property list; no canvas edge.
**Why:** Only inter-class relationships deserve canvas edges. Datatype properties are attributes, not relationships.

### D-03: Node IDs
**Decision:** Node IDs derived deterministically from the local name: `"node_" + localName(uri)`. Edge IDs: `"e_{sourceId}_{type}_{targetId}"`.
**Why:** Deterministic IDs let position overlays survive round-trips through Turtle parse/serialize without requiring a lookup table.

### D-04: Bidirectional Sync Strategy
**Decision:** Subscribe-based (Option 1). `useOntologySync` hook subscribes to `ontologyStore` via `useEffect`. `isUpdatingFromCanvas` and `isUpdatingFromEditor` are `useRef` booleans inside the hook.
**Why:** React Flow's `onNodesChange` fires on every drag frame — too noisy for triggering serialization. Subscribe-based lets us debounce the canvas→Turtle direction cleanly and keeps all sync logic in one hook.

### D-05: Editor Debounce
**Decision:** 600ms debounce on Turtle editor changes before attempting parse and canvas update. The raw string is written to `turtleSource` immediately on every keystroke. Parse failures show a CodeMirror 6 diagnostic (red underline) and leave the canvas unchanged.
**Why:** Parsing on every keystroke is expensive and would flash the canvas on every character. 600ms means the canvas updates only when the user pauses typing.

### D-06: Tab Order
**Decision:** `SRC | ONTO | MAP | OUT`. ONTO is the second tab. `uiStore.RightTab` type extended to include `'ONTO'`.
**Why:** SRC (source data) comes first because it's the primary data input. ONTO (master ontology Turtle editor) is second. MAP and OUT follow in workflow order.

### D-07: Export Formats
**Decision:** Turtle (.ttl) primary; JSON-LD (.jsonld) in collapsible section. RDF/XML deferred indefinitely — N3.js doesn't produce it natively and no extra library is warranted.
**Why:** Turtle + JSON-LD covers all practical downstream uses. RDF/XML is legacy.

### D-08: Edge Creation in Phase 2
**Decision:** Turtle-text authoring only. No drag-to-connect between canvas handles in Phase 2. Edges appear on canvas only when parsed from Turtle. Canvas handles exist on ClassNode rows but are not interactive for edge creation this phase.
**Why:** Turtle editing is the primary authoring path and keeps Phase 2 scope focused. Visual edge drawing deferred to Phase 4 (mapping edges).

### D-09: Project File Schema (.onto-mapper.json)
**Decision:** Option C hybrid — canonical Turtle + position overlay + forward-compatible phase envelopes:
```json
{
  "version": 1,
  "ontology": {
    "turtleSource": "...",
    "nodePositions": { "node_AirTrack": { "x": 120, "y": 80 } }
  },
  "sources": [],
  "mappings": [],
  "timestamp": "2026-03-24T10:00:00Z"
}
```
On load: parse `turtleSource` → derive nodes/edges → overlay `nodePositions`. Turtle is canonical; positions are layout-only.
**Why:** Forward-compatible without migrations in Phase 3/4. Turtle stays authoritative for RDF content.

### D-10: Auto-Save Scope
**Decision:** idb-keyval key `'rosetta-project'`. Zustand `ontologyStore.subscribe()` → debounced 500ms → write full `.onto-mapper.json` envelope. Load on `useAutoSave` mount (startup).
**Why:** Single key keeps IDB simple. 500ms debounce from REQ-16. Full envelope written even in Phase 2 so Phase 3 can add sources without changing the save logic.

## Review Decisions

### R-01: JSON-LD Export Strategy
**Decision:** Use `jsonld` npm library. Serialize ontology via N3 to N-Quads, then call `jsonld.fromRDF()` to produce JSON-LD. N3.Writer does NOT support `application/ld+json` format.
**Why:** N3.js only outputs Turtle/TriG/N-Triples/N-Quads. The `jsonld` package is already in the project's tech stack list.

### R-02: Debounce Timer Cleanup
**Decision:** `useOntologySync` must return a cleanup function from its `useEffect` that clears both debounce timer refs on unmount.
**Why:** Prevents stale state updates in React StrictMode (dev) and on hot module reload. Standard React practice.

### R-03: Editor Focus Guard
**Decision:** Skip canvas→editor `EditorView.dispatch` when the CM6 editor has focus. The editor's content will sync next time the user pauses typing (via the editor→canvas debounce path).
**Why:** Programmatic dispatch while user is typing causes cursor jumps. Skipping is safe because the editor→canvas path will re-sync when the user pauses.

### R-04: Import Confirmation
**Decision:** Show `window.confirm('Import will replace your current work. Continue?')` before overwriting stores on project file import.
**Why:** Prevents accidental data loss. Auto-save doesn't help because IDB is immediately overwritten by the import.

### R-05: Import Schema Validation
**Decision:** Validate `ontology.turtleSource` is a string (and `ontology.nodePositions` is an object) before calling `parseTurtle`. Show inline error on validation failure.
**Why:** A file with `version: 1` but malformed inner structure would crash without validation.

### R-06: ontologyStore Type Narrowing
**Decision:** Update `ontologyStore.ts` to import and use `OntologyNode`/`OntologyEdge` types from `src/types/index.ts` instead of generic `Node`/`Edge`.
**Why:** Type safety — generic types allow any node/edge shape; narrowed types catch mismatches at compile time.

## NOT in scope
- Diff-based CM6 dispatch (considered for canvas→editor sync, deferred — skip-if-focused is simpler)
- IDB backup/versioning (single key is sufficient for a learning tool)
- File size limit on import (OOM risk is negligible for typical ontology files)
- Auto-layout (dagre/elk) for newly parsed nodes (nodes default to 0,0; user positions via drag)

## Deferred
- RDF/XML export → out of scope (no target phase)
- Drag-to-connect edges on canvas → Phase 4 (mapping edges)
- Inline property editing on ClassNode → Turtle editor is the editing surface
- Property node expansion toggle (collapsed/expanded state) → Phase 7 polish
- CodeMirror syntax error diagnostics → nice-to-have, not blocking
