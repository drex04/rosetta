# Phase 4: Mapping (Per-Source) — Context & Locked Decisions

**Date:** 2026-03-26
**Phase:** 04-mapping
**Status:** Decisions locked — ready for execution

---

## Design Decisions

### DD-01: Handle typing — ClassNode gets left-side target handles per property

**Decision:** SourceNode prop handles remain `type="source" / Position.Right`. ClassNode gains a **new** `type="target" / Position.Left` handle per property row (id: `target_prop_${label}`). The existing `class-left` class-level handle stays `isConnectable={false}`.

**Why:** React Flow requires source→target pairing. Flipping ClassNode right handles would break master-ontology edge rendering. Adding left-side target handles per property keeps symmetry and allows clean drag-from-source-to-target UX.

**How to apply:** In ClassNode.tsx, add a `<Handle type="target" position={Position.Left} id={\`target_prop_\${prop.label}\`} isConnectable={true} .../>` inside each property row div. In SourceNode.tsx, set `isConnectable={true}` on the per-property `type="source"` handles only (not class-level handles). Class-level handles (top/bottom/left/right) remain `isConnectable={false}`.

---

### DD-02: SPARQL editor — CodeMirror 6

**Decision:** Use CodeMirror 6 in the MAP panel for CONSTRUCT query display and editing. Do NOT use YASGUI.

**Why:** YASGUI is a full standalone IDE; awkward to embed in a side panel. CodeMirror 6 is already used for the Turtle editor — consistent UX, lightweight, sufficient for single-query display + edit.

**How to apply:** Reuse the CodeMirror setup from TurtleEditorPanel. Use `@codemirror/lang-{sparql or generic}` or configure as plain text with minimal highlighting. The editor shows the auto-generated CONSTRUCT and allows user edits; a "Regenerate" button resets to auto-generated.

---

### DD-03: Mapping granularity — property-to-property only

**Decision:** Connections are property-to-property only. Users drag from a specific SourceNode property handle to a specific ClassNode property target handle. Class-to-class dragging is not supported in Phase 4.

**Why:** Property-level granularity enables precise SPARQL CONSTRUCT generation (one binding per mapped pair). Class-level would require a secondary configuration step to select which properties align — more complexity for less precision.

**How to apply:** The `isValidConnection` guard checks that both `sourceHandle` and `targetHandle` start with `prop_` / `target_prop_` respectively. Class-level handles remain `isConnectable={false}`.

---

### DD-04: Edge grouping — deferred to Phase 7

**Decision:** Visual edge bundling (multiple mapping edges between the same class pair rendered as a grouped edge with count badge) is deferred to Phase 7 (Onboarding & Polish).

**Why:** Phase 4 exit criteria are met by individual per-property mapping edges. Bundling is a polish concern, not a functional one.

**How to apply:** Do not implement edge grouping logic in Phase 4 plans. Each Mapping renders as exactly one `mappingEdge` on the canvas.

---

## Error/Rescue Map (Phase 4 scope)

| OPERATION | ERROR | NAMED EXCEPTION | RESCUE ACTION | USER SEES |
|-----------|-------|-----------------|---------------|-----------|
| onConnect drag | Same-type connection (source→source) | `InvalidConnectionError` | Guard in `isValidConnection`, reject | Nothing (drag snaps back) |
| onConnect drag | No source/target node found in store | `StaleNodeError` | Early return, no mapping created | Nothing |
| SPARQL generate | Prop URI not found in node data | `MissingPropError` | Fallback to `?val` variable name | CONSTRUCT with generic var |
| SPARQL edit | Malformed SPARQL in editor | `ParseError` | CodeMirror error gutter | Red underline in editor |
| IDB save | Mapping save fails | `IDBWriteError` | console.error + error banner | "Save failed" banner |

---

## Failure Modes Registry

| CODEPATH | FAILURE MODE | RESCUED? | TEST? | USER SEES? | LOGGED? |
|----------|--------------|----------|-------|------------|---------|
| `isValidConnection` | Source→source drag accepted | Y | Y | N | N |
| `onConnect` URI lookup | Prop not found in node data | Y | Y | N | N |
| SPARQL generator | Missing prefix on source URI | Y | Y | N | N |
| `useCanvasData` | Mapping refs deleted source | Y | N | N | N |
| IDB persistence | Mapping save fails | Y | N | Y | Y |

---

## Review Decisions (2026-03-26)

### RD-01: localName import — use rdf.ts

`sparql.ts` MUST import `localName` from `src/lib/rdf.ts` rather than re-implementing it. `derivePrefix` stays local to `sparql.ts`. Reason: `localName` is the authoritative derivation used for node IDs and handle labels — any divergence silently breaks handle matching.

### RD-02: Mapping interface — store handle strings

`Mapping` interface gains two fields:
```typescript
sourceHandle: string  // e.g. 'prop_trackId' — stored directly from connection
targetHandle: string  // e.g. 'target_prop_identifier' — stored directly from connection
```
`onConnect` stores `connection.sourceHandle` and `connection.targetHandle` directly. `useCanvasData` uses them verbatim when materializing edges. Never re-derive handle IDs from URIs.

### RD-03: onEdgesDelete handler

`OntologyCanvas.tsx` must implement `onEdgesDelete` that calls `useMappingStore.getState().removeMapping(m.id)` for any deleted edge whose `id` starts with `'mapping_'`. Prevents canvas/store desync when user presses Delete/Backspace on a mapping edge.

### RD-04: Duplicate mapping guard

`addMapping` must check for an existing mapping with the same `sourceClassUri + sourcePropUri + targetClassUri + targetPropUri` before inserting. If found, return the existing `id`. This guard must be tested.

### RD-05: SPARQL lint badge

`MappingPanel` CodeMirror editor shows a visual badge (green = valid, amber = suspect) based on whether the stored SPARQL contains both `CONSTRUCT` and `WHERE` as keywords. Query is stored regardless of badge state. No new package needed.

### RD-06: isValidMappings type guard

`useAutoSave` restore path wraps the `hydrate()` call in a type guard:
```typescript
function isValidMappings(v: unknown): v is Record<string, Mapping[]> {
  return typeof v === 'object' && v !== null && !Array.isArray(v) &&
    Object.values(v as object).every(Array.isArray)
}
```
If the guard fails, log `[useAutoSave] Skipping malformed mappings from IDB` and skip hydration.

---

## NOT in scope (Phase 4)

- SPARQL execution / data fusion → Phase 6
- SHACL validation of mapped pairs → Phase 5
- Edge bundling / count badge for multi-mapped class pairs → Phase 7
- Undo/redo of mapping operations → not in v1 scope
- Inline Comunica validation of stored SPARQL → Phase 6 (when execution is wired)
- Class-to-class drag mapping → not in v1 scope (property-level only per DD-03)
- Mapping summary export (CSV/JSON) → not in v1 scope

---

## Deferred (out of Phase 4 scope)

- Edge grouping / bundled mapping visual → Phase 7
- SHACL validation of mappings → Phase 5
- SPARQL CONSTRUCT execution / data fusion → Phase 6
- OWL reasoning or complex mapping transforms → out of v1 scope
