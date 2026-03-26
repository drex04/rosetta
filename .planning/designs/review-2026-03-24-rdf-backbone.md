---
created: 2026-03-24
type: plan-review
phase: 02-rdf-backbone
mode: HOLD SCOPE
---

# Plan Review: Phase 2 — RDF Backbone

## Mode: HOLD SCOPE

Plans are well-structured with 10 locked design decisions and clear wave dependencies. Reviewed for error handling, sync race conditions, and data flow edge cases.

## Completion Summary

```
+====================================================================+
|            PLAN REVIEW — COMPLETION SUMMARY                        |
+====================================================================+
| Mode selected        | HOLD SCOPE                                  |
| System Audit         | Clean state, Phase 1 complete, no stashes   |
| Step 0               | HOLD SCOPE — plans well-scoped, no expansion|
| Section 1  (Arch)    | 0 blocking issues (prop-drilling noted)     |
| Section 2  (Errors)  | 7 error paths mapped, 4 GAPS fixed          |
| Section 3  (Security)| 2 issues found, 0 High severity             |
| Section 4  (Data/UX) | 8 edge cases mapped, 2 unhandled → fixed    |
| Section 5  (Tests)   | Diagram produced, 4 test gaps → truths added|
| Section 6  (Future)  | Reversibility: 5/5, debt items: 3 (all Low) |
+--------------------------------------------------------------------+
| PLAN.md updated      | 9 truths added, 0 artifacts added            |
| CONTEXT.md updated   | 6 decisions locked, 4 items deferred         |
| Error/rescue registry| 14 methods, 4 CRITICAL GAPS → PLAN.md       |
| Failure modes        | 14 total, 4 CRITICAL GAPS → PLAN.md          |
| Delight opportunities| N/A (HOLD SCOPE)                            |
| Diagrams produced    | 3 (dependency graph, editor→canvas flow,    |
|                      |    canvas→editor flow)                       |
| Unresolved decisions | 0                                           |
+====================================================================+
```

## What Already Exists

| Sub-problem | Existing code | Reuse strategy |
|---|---|---|
| Store state | `ontologyStore.ts` (Node[], Edge[], turtleSource) | Narrow types to OntologyNode/OntologyEdge |
| Tab infrastructure | `RightPanel.tsx` + `uiStore.ts` | Add ONTO tab to existing Tabs component |
| Canvas rendering | `OntologyCanvas.tsx` + `useCanvasData.ts` | Extend with nodeTypes/edgeTypes/onNodesChange |
| Header/Toolbar | `Header.tsx`, `Toolbar.tsx` | Add status indicator and export/import buttons |

## Dream State Delta

```
CURRENT STATE                    THIS PLAN                        12-MONTH IDEAL
Static shell with empty          Live RDF graph from Turtle,      Full mapping workflow:
React Flow canvas, placeholder   bidirectional sync, auto-save,   source import, master ontology,
tabs, no RDF processing          export .ttl/.jsonld/.json        visual mapping, SPARQL, SHACL
```

Phase 2 delivers the RDF foundation that every subsequent phase builds on. `lib/rdf.ts` becomes the canonical data layer. The bidirectional sync pattern establishes the template for source↔canvas sync in Phase 3+.

## Key Diagrams

### Dependency Graph (After Phase 2)

```
App.tsx
 ├─ Header.tsx  ←── saveStatus prop (from useAutoSave)
 ├─ Toolbar.tsx  ←── export/import actions (reads ontologyStore)
 ├─ SourceSelector.tsx
 ├─ OntologyCanvas.tsx ─── useCanvasData.ts ─── ontologyStore.ts
 │     ↑ onCanvasChange prop                        ↑
 │     └────── useOntologySync ──────────────────────┘
 │                  ↕                                ↑
 │              lib/rdf.ts ← parseTurtle/canvasToTurtle
 │                  ↕                                │
 └─ RightPanel.tsx ─── uiStore.ts                    │
      └─ TurtleEditorPanel.tsx ──── onEditorChange ──┘
                                        (from useOntologySync)
 useAutoSave.ts ─── idb-keyval ─── ontologyStore.subscribe
```

### Editor → Canvas Data Flow

```
USER TYPES ──▶ setTurtleSource ──▶ debounce 600ms ──▶ parseTurtle ──▶ overlay positions ──▶ setNodes/setEdges
                                       │                    │                                     │
                                  [timer reset        [invalid → catch              [canvas re-renders]
                                   each keystroke]     → canvas unchanged]
```

### Canvas → Editor Data Flow

```
DRAG NODE ──▶ onNodesChange ──▶ debounce 100ms ──▶ canvasToTurtle ──▶ setTurtleSource
                                                                            │
                                                                   [skip if editor focused]
```

## Review Decisions Made

1. **JSON-LD export:** Use `jsonld` library (N3→N-Quads→`jsonld.fromRDF()`), not N3.Writer
2. **Timer cleanup:** useOntologySync clears debounce timers on unmount
3. **Editor focus guard:** Skip canvas→editor dispatch when editor has focus
4. **Import confirmation:** `window.confirm` before overwriting current work
5. **Import validation:** Validate `ontology.turtleSource` is string before parsing
6. **Store type narrowing:** Use `OntologyNode`/`OntologyEdge` in ontologyStore

## Error & Rescue Registry

```
METHOD/CODEPATH              | ERROR TYPE              | RESCUED? | USER SEES
-----------------------------|-------------------------|----------|------------------
parseTurtle (invalid)        | N3.Parser error         | Y        | Canvas unchanged
parseTurtle (empty)          | [review-added]          | Y        | Empty canvas
parseTurtle (no classes)     | [review-added]          | Y        | Empty canvas
localName (edge-case URI)    | [review-added]          | Y        | Fallback to full URI
canvasToTurtle (failure)     | N3.Writer error         | Y        | Editor unchanged
onEditorChange (parse fail)  | Caught in sync hook     | Y        | Canvas unchanged
onCanvasChange (serial fail) | Caught in sync hook     | Y        | Editor unchanged
IDB get() failure            | DOMException            | Y        | Fresh start
IDB set() failure            | DOMException            | Y        | "Save failed" indicator
Import JSON.parse failure    | SyntaxError             | Y        | Inline error
Import version mismatch      | Schema mismatch         | Y        | Inline error
Import invalid turtleSource  | [review-added]          | Y        | Inline error
Import overwrites silently   | [review-added]          | Y        | window.confirm
JSON-LD export               | [review-fixed]          | Y        | Uses jsonld lib
```

## Failure Modes Registry

```
CODEPATH              | FAILURE MODE        | RESCUED? | TEST? | USER SEES?    | LOGGED?
----------------------|---------------------|----------|-------|---------------|--------
parseTurtle           | Invalid syntax      | Y        | Y     | No change     | N
parseTurtle           | Empty input         | Y        | N→Y   | Empty canvas  | N
parseTurtle           | No owl:Class        | Y        | N→Y   | Empty canvas  | N
localName             | No # or / segment   | Y        | N→Y   | Fallback URI  | N
useOntologySync       | Timer leak unmount  | Y        | N→Y   | None          | N
Import                | Silent overwrite    | Y        | N     | Confirm dialog| N
Import                | Malformed schema    | Y        | N     | Inline error  | N
JSON-LD export        | N3 doesn't support  | Y        | N     | Uses jsonld   | N
```

All CRITICAL GAPS have been resolved via review truths in PLAN.md files.
