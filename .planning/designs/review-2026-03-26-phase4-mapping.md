# Plan Review — Phase 4: Mapping (Per-Source)

**Date:** 2026-03-26
**Mode:** HOLD SCOPE
**Plans reviewed:** 04-01, 04-02, 04-03

---

## What Already Exists

- `localName(uri)` exported from `src/lib/rdf.ts:30` — authoritative for node/handle ID derivation
- `useAutoSave` subscribe/snapshot pattern established (phases 02–03)
- CodeMirror 6 editor pattern from `TurtleEditorPanel`
- `useCanvasData` returns `{ nodes, edges }` — mapping edges slot in alongside master/source edges

## Dream State Delta

```
AFTER PHASE 4                         12-MONTH IDEAL DELTA
──────────────────────────────────     ─────────────────────────────────────
✓ mappingStore (per-source)            + SHACL validation of pairs (Phase 5)
✓ dashed-green mapping edges           + CONSTRUCT execution / fusion (Phase 6)
✓ MappingPanel (list + SPARQL editor)  + edge bundling polish (Phase 7)
✓ IDB persistence of mappings          + undo/redo (out of v1 scope)
```

---

## Decisions Locked

| # | Decision | Impact |
|---|----------|--------|
| RD-01 | `sparql.ts` imports `localName` from `rdf.ts` | Eliminates handle-ID divergence risk |
| RD-02 | `Mapping` stores `sourceHandle`/`targetHandle` strings directly | Eliminates silent edge mis-render at (0,0) |
| RD-03 | `onEdgesDelete` in OntologyCanvas calls `removeMapping` | Closes canvas/store desync on keyboard delete |
| RD-04 | `addMapping` dedup guard (same prop pair → return existing id) | Prevents duplicate rows in list |
| RD-05 | SPARQL lint badge (CONSTRUCT+WHERE keyword check) in MappingPanel | Surfaces malformed queries without blocking save |
| RD-06 | `isValidMappings` type guard before `hydrate()` in useAutoSave | Prevents silent corruption from malformed IDB |

---

## System Architecture

```
OntologyCanvas.tsx
  ├── isValidConnection ──► prop_* → target_prop_* check
  ├── onConnect ──────────► generateConstruct → addMapping (with sourceHandle/targetHandle)
  ├── onEdgesDelete ──────► removeMapping for mapping_ edges  ← NEW (RD-03)
  └── edgeTypes { mappingEdge }

useCanvasData.ts
  └── mappingEdges: Mapping[] → Edge[] using stored handle strings (RD-02)

MappingPanel.tsx  [new]
  ├── mapping list (select, delete)
  ├── CodeMirror SPARQL editor + lint badge (RD-05)
  └── Regenerate button → generateConstruct → updateMapping

mappingStore.ts  [new]
  ├── addMapping (with dedup guard, RD-04)
  ├── removeMapping / updateMapping / hydrate
  └── getMappingsForSource

sparql.ts  [new]
  ├── generateConstruct
  ├── import { localName } from rdf.ts  (RD-01)
  └── derivePrefix (local)

useAutoSave.ts
  ├── subscribe to mappingStore
  ├── snapshot includes mappings
  └── restore: isValidMappings guard → hydrate (RD-06)
```

---

## Error & Rescue Registry

| METHOD | ERROR | RESCUED? | USER SEES |
|--------|-------|----------|-----------|
| `isValidConnection` | Wrong handle prefix | Y — rejected | Nothing (snap back) |
| `onConnect` | No active source | Y — early return | Nothing |
| `onConnect` | Source/target node not found | Y — early return | Nothing |
| `onConnect` | Prop not found in node.data | Y — early return | Nothing |
| `addMapping` | Duplicate prop pair | Y — RD-04 dedup | Nothing (silent no-op) |
| `generateConstruct` | Bare-name URI | Y — return uri as-is | CONSTRUCT with full URI |
| `generateConstruct` | Empty URI | Y — fallback 'unknown' | CONSTRUCT with ?unknown |
| `useCanvasData` | Stale mapping ref | Y — skip edge | Nothing |
| `onEdgesDelete` | Canvas edge deleted | Y — RD-03 handler | Edge removed cleanly |
| MappingPanel editor | Malformed SPARQL | Y (lint badge, RD-05) | Amber badge |
| `useAutoSave` IDB write | QuotaExceededError | Y — error banner | "Save failed" indicator |
| `useAutoSave` restore | Malformed mappings | Y — RD-06 guard | Nothing (logged) |

---

## Failure Modes Registry

| CODEPATH | FAILURE | RESCUED? | TEST? | USER SEES? | LOGGED? |
|----------|---------|----------|-------|------------|---------|
| `isValidConnection` | Source→source accepted | Y | Y | N | N |
| `onConnect` URI lookup | Prop missing | Y | Y | N | N |
| `addMapping` | Duplicate pair | Y | Y (RD-04) | N | N |
| `useCanvasData` materialization | Stale ref | Y | Y | N | N |
| `onEdgesDelete` | Desync | Y (RD-03) | Y | N | N |
| SPARQL edit | Malformed stored | Y (RD-05) | Y | amber badge | N |
| `useAutoSave` write | IDB fail | Y | manual | banner | Y |
| `useAutoSave` restore | Bad shape | Y (RD-06) | Y | N | Y |

---

## Completion Summary

```
+====================================================================+
|            PLAN REVIEW — COMPLETION SUMMARY                        |
+====================================================================+
| Mode selected        | HOLD SCOPE                                  |
| System Audit         | localName duplication, 2 uncommitted changes|
| Step 0               | HOLD SCOPE confirmed, 6 issues pre-surfaced |
| Section 1 (Arch)     | 2 issues found (localName dup, handle ID)   |
| Section 2 (Errors)   | 12 error paths mapped, 4 GAPS → fixed       |
| Section 3 (Security) | 0 high-severity issues                      |
| Section 4 (Data/UX)  | 8 edge cases mapped, 1 WARNING → fixed      |
| Section 5 (Tests)    | Diagram produced, 5 missing test specs noted|
| Section 6 (Future)   | Reversibility: 5/5, debt items: 1 (comment)|
+--------------------------------------------------------------------+
| PLAN.md updated      | 04-01: +3 truths; 04-02: +4 truths;        |
|                      | 04-03: +1 truth                             |
| CONTEXT.md updated   | 6 decisions locked, 7 items deferred        |
| Error/rescue registry| 12 methods, 0 remaining CRITICAL GAPS       |
| Failure modes        | 8 total, 0 remaining CRITICAL GAPS          |
| Diagrams produced    | 2 (architecture, data flow)                 |
| Unresolved decisions | 0                                           |
+====================================================================+
```
