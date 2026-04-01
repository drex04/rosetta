# Plan Review — Phase 10: Canvas Interactions & Panel Integration
**Date:** 2026-04-01  
**Mode:** HOLD SCOPE  
**Plans reviewed:** 10-01, 10-02, 10-03

---

## Mode Selected

**HOLD SCOPE** — Scope matches REQ-96–106 cleanly. Reviewed all 3 plans with maximum rigor.

---

## System Audit

- Codebase mapping: **STALE** (69 files changed since last mapping). No FLOWS.md/ERD.md.
- Working tree: `ClassNode.tsx` has minor cosmetic style tweaks (harmless). `vitest.config.ts` modified.
- `useCanvasData`, `ontologyStore`, `sourcesStore`, `MappingEdge` — none of the new actions/fields exist yet (all plans are pre-execution).
- REQ-107 already shipped in Phase 9. Correctly excluded from Phase 10 plans.
- No in-flight stashes or PRs.

---

## What Already Exists (Existing Code Leverage)

| Sub-problem | Existing code |
|---|---|
| Callback injection into node.data | `data.onContextMenu` pattern → reused for `onCommitEdit`/`onStartEdit` |
| Edge type picker | `EdgePickerState` already in OntologyCanvas → 10-03 extends it |
| Mapping edge selection styling | `MappingEdge` already receives `selected` prop → 10-02 extends |
| Turtle sync trigger | `onCanvasChange` → `canvasToTurtle` already wired → inline edits hook in |
| Source schema mutations | `updateSource(sourceId, patch)` already exists → 10-03 reuses |

---

## Dream State Delta

```
CURRENT STATE           THIS PLAN DELTA             12-MONTH IDEAL
window.prompt rename  → Inline inputs, edge        → Undo stack, keyboard
No edge type labels     type picker, kind badges,    nav between nodes,
No canvas↔panel nav    bidirectional panel nav       collaborative editing
```

---

## Decisions Made During Review

| # | Decision | Locked in |
|---|---|---|
| 1 | `onBlur` commits (same as Enter) on all 3 edit surfaces | CONTEXT.md + 10-01 truths |
| 2 | `onInvalidateMappings` → delete affected mappings + toast count | CONTEXT.md + 10-01 truths |
| 3 | `canvasToTurtle` failure → revert store to pre-edit snapshot | CONTEXT.md + 10-01 Task 4 + truths |
| 4 | `useCanvasData` split into two memos (base + selection) | CONTEXT.md + 10-02 truths + Task 1 |
| 5 | `onNodeDoubleClick` calls both `setActiveRightTab` AND `data.onStartEdit` | CONTEXT.md + 10-02 truths |

---

## Architecture Diagram

```
OntologyCanvas.tsx (722→~900 lines)
  ├── data injection (per node):
  │     onCommitEdit, onStartEdit(via editTrigger counter), onContextMenu
  ├── handlers:
  │     onEdgeClick → setSelectedMappingId + setActiveRightTab('MAP')
  │     onNodeDoubleClick → setActiveRightTab + data.onStartEdit
  │     onEdgeDoubleClick → EdgePickerState(mode:'edit', edgeId)
  │     handleEdgePickerSelect → dispatch on mode:
  │         create-onto → addOntologyEdge + onCanvasChange
  │         create-source → updateSource
  │         edit (onto) → replaceEdge + onCanvasChange
  │         edit (source) → updateSource
  └── Panel buttons → handleAddClass / handleAddSourceClass

ClassNode / SourceNode:
  editingHeader ──onDoubleClick──▶ EDITING
       ▲                              │ Enter / onBlur → commitHeader()
       └──────────ESC─────────────────┘

ontologyStore NEW: updateNode, updateProperty, replaceEdge
sourcesStore NEW: updateSchemaNode
useCanvasData: base memo (structure) + selection memo (selected:bool)
```

---

## Error & Rescue Registry

| Method | Error | Rescued? | User Sees |
|---|---|---|---|
| `commitHeader()` | empty label | Y | Inline error text |
| `commitHeader()` | URI missing colon | Y | Inline error text |
| `commitProp()` | duplicate name | Y | Inline error text |
| `onCanvasChange` / `canvasToTurtle` | serialization throws | Y | Toast + store reverted |
| `updateNode` / `updateSchemaNode` | nodeId not found | Y (no-op) | Nothing |
| `onInvalidateMappings` | property URI changed | Y | Toast with count |
| `replaceEdge` | oldId not found | Y (no-op) | Nothing |

---

## Test Coverage Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                   TEST COVERAGE                              │
├──────────────────────────────┬──────────┬───────────────────┤
│ CODEPATH                     │ TYPE     │ STATUS            │
├──────────────────────────────┼──────────┼───────────────────┤
│ commitHeader validation      │ Unit     │ ✓ Covered         │
│ commitProp duplicate guard   │ Unit     │ ✓ Covered         │
│ updateNode label+uri         │ Unit     │ ✓ Covered         │
│ updateNode non-existent id   │ Unit     │ ✓ Added [review]  │
│ onBlur → commit              │ Unit     │ ✓ Added [review]  │
│ store revert on failure      │ Unit     │ ✓ Added [review]  │
│ onInvalidateMappings → del   │ Unit     │ ✓ Added [review]  │
│ replaceEdge (4 paths)        │ Unit     │ ✓ Covered         │
│ handleEdgePickerSelect       │ Unit     │ ✓ Covered         │
│ kind badge rendering         │ Unit     │ ✓ Covered         │
│ selectedMappingId → style    │ Unit     │ ✓ Covered         │
│ Double-click header E2E      │ E2E      │ ✓ Covered         │
│ Mapping edge click → tab     │ E2E      │ — smoke only      │
│ Double-click edge type       │ E2E      │ ✓ Covered         │
└──────────────────────────────┴──────────┴───────────────────┘
```

---

## Failure Modes Registry

| Codepath | Failure | Rescued? | Test? | User Sees | Logged? |
|---|---|---|---|---|---|
| commitHeader | empty label | Y | Y | Inline error | N/A |
| commitHeader | bad URI | Y | Y | Inline error | N/A |
| commitProp | duplicate name | Y | Y | Inline error | N/A |
| canvasToTurtle | serialize error | Y | Y | Toast + revert | console.error |
| updateNode | unknown nodeId | Y (no-op) | Y | Nothing | N/A |
| onInvalidateMappings | stale mapping handles | Y | Y | Toast with count | N/A |
| onEdgeDoubleClick | edge not found | Y (no-op) | N | Nothing | N/A |

---

## Technical Debt Introduced

1. **OntologyCanvas approaching god-component territory** (~900 lines after all 3 plans). A `useNodeCallbacks` hook extracting callback factories would halve size. Flagged for Phase 11.
2. **`editTrigger` counter pattern** is non-obvious indirection. Should be documented in CLAUDE.md as a canvas editing pattern.
3. `onNodeDoubleClick` dual-behavior (tab switch + inline edit) is an inter-plan dependency with no dedicated integration test beyond the E2E scenarios.

---

## Completion Summary

```
+====================================================================+
|            PLAN REVIEW — COMPLETION SUMMARY                        |
+====================================================================+
| Mode selected        | HOLD SCOPE                                  |
| System Audit         | Stale codebase map; 3 new plan files        |
| Step 0               | HOLD confirmed; expansion deferred to CONTEXT|
| Section 1  (Arch)    | 2 gaps found (onBlur, non-existent nodeId)  |
| Section 2  (Errors)  | 7 error paths mapped, 2 CRITICAL GAPS fixed |
| Section 3  (Security)| 0 issues — no new attack surface            |
| Section 4  (Data/UX) | 4 edge cases mapped, 0 unhandled           |
| Section 5  (Tests)   | Diagram produced, 4 unit + 1 E2E gaps added|
| Section 6  (Future)  | Reversibility: 4/5, debt items: 3          |
+--------------------------------------------------------------------+
| Section 7  (Eng Arch)| 1 issue: onNodeDoubleClick inter-plan dep   |
| Section 8  (Code Ql) | 0 DRY violations; editTrigger pattern noted |
| Section 9  (Eng Test)| Test diagram produced, gaps all addressed   |
| Section 10 (Perf)    | 1 issue: useCanvasData memo split added     |
+--------------------------------------------------------------------+
| PLAN.md updated      | 10-01: +4 truths; 10-02: +2 truths         |
| CONTEXT.md updated   | 5 [review] decisions added                  |
| Error/rescue registry| 7 methods, 2 CRITICAL GAPS → plan truths    |
| Failure modes        | 7 total, 0 remaining CRITICAL GAPS          |
| Diagrams produced    | 4 (arch, data flow, state machine, test)    |
| Unresolved decisions | 0                                           |
+====================================================================+
```
