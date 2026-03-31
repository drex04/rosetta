# Plan Review — Phase 05-03 SHACL Validation UI
**Date:** 2026-03-27 | **Mode:** HOLD SCOPE | **Plan reviewed:** 05-03

## Completion Summary

```
+====================================================================+
|            PLAN REVIEW — COMPLETION SUMMARY (05-03)               |
+====================================================================+
| Mode selected        | HOLD SCOPE                                  |
| System Audit         | Plans 01/02 not yet executed; 05-03 is      |
|                      | correctly wave 3. No stash/branches. Fresh  |
|                      | codebase map.                               |
| Step 0               | HOLD SCOPE. 8 files, all required.          |
|                      | No deferrable items.                        |
| Section 1  (Arch)    | 1 critical gap (highlightedCanvasNodeId     |
|                      | not cleared on re-validate)                 |
| Section 2  (Errors)  | 5 paths mapped, 0 CRITICAL GAPS             |
| Section 3  (Security)| 0 issues — client-side only, JSX rendering  |
| Section 4  (Data/UX) | 6 edge cases mapped, 1 gap (re-validate     |
|                      | ring), 1 dead import                        |
| Section 5  (Tests)   | Diagram produced, 4 gaps noted              |
|                      | (⚠ badge, error state, null no-op,          |
|                      | re-validate clears ring) — 2 deferred       |
| Section 6  (Future)  | Reversibility: 5/5, 2 deferred items        |
+--------------------------------------------------------------------+
| Section 7  (Eng Arch)| 0 issues found — clean store-mediated arch  |
| Section 8  (Code Ql) | 1 dead import (getMappingsForSource)        |
| Section 9  (Eng Test)| Test diagram produced, see Section 5        |
| Section 10 (Perf)    | 0 High issues — per-node subscription OK   |
+--------------------------------------------------------------------+
| PLAN.md updated      | 4 truths added, badge logic fixed           |
| CONTEXT.md updated   | 3 decisions added, 4 deferred items added   |
| Error/rescue registry| 5 methods, 0 CRITICAL GAPS                  |
| Failure modes        | 1 CRITICAL GAP → PLAN.md truth              |
| Diagrams produced    | 2 (dependency graph, test coverage)         |
| Unresolved decisions | 0                                           |
+====================================================================+
```

## What Already Exists (Leverage)

- `localName` from `src/lib/rdf.ts` — correctly used in ValidationPanel spec
- `freshPage` fixture in `e2e/fixtures.ts` — handles IDB clear for E2E tests
- `rfInstance` ref in `OntologyCanvas.tsx` already captures the ReactFlow instance
- `useSourcesStore` subscribe pattern — mirrors the mapping stale-detection pattern

## Critical Gap Fixed

**`highlightedCanvasNodeId` not cleared on re-validate:**
`runValidation` (Plan 02) calls `set({ results, loading: false, stale: false, lastRun: ... })`. Since `highlightedCanvasNodeId` doesn't exist when Plan 02 is written, it's not included. Plan 03 Task 2 now explicitly instructs the executor to update that `set()` call to add `highlightedCanvasNodeId: null`.

## Dead Import Fixed

`getMappingsForSource` was listed in Task 1's SourceSelector badge logic but the status computation never used it. Removed from plan spec — badge derives status solely from `results[source.id]` and `lastRun`.

## Architecture Diagram

```
DEPENDENCY GRAPH

ValidationPanel ─────────────────────┐
                                     ▼
SourceSelector ────────────► validationStore ◄── OntologyCanvas
                                     ▲              (fitView on
SourceNode (per canvas node) ────────┘               highlight change)
reads highlightedCanvasNodeId
→ applies ring-destructive
```

## Test Coverage Diagram

```
┌────────────────────────────────────────┬──────────┬────────────────────────┐
│ CODEPATH                               │ TYPE     │ STATUS                 │
├────────────────────────────────────────┼──────────┼────────────────────────┤
│ VAL tab renders                        │ E2E      │ ✓ Test 1               │
│ Placeholder before run                 │ E2E      │ ✓ Test 2               │
│ Validate button present                │ E2E      │ ✓ Test 3               │
│ "All valid" after valid run            │ E2E      │ ✓ Test 4               │
│ Stale banner after mapping change      │ E2E      │ ✓ Test 5               │
│ Badge ○ → ✓ transition                 │ E2E      │ ✓ Test 6               │
│ Violation click → ring-destructive     │ E2E      │ ✓ Test 7 (review-added)│
│ ValidationPanel error state            │ Unit     │ ~ via validationStore  │
│                                        │          │   unit test (deferred) │
│ Null canvasNodeId → no-op click        │ E2E/Unit │ ✗ MISSING (deferred)   │
│ Badge ⚠ (violations present)           │ E2E      │ ✗ MISSING (deferred)   │
│ Re-validate clears ring                │ E2E/Unit │ ✗ MISSING (deferred)   │
└────────────────────────────────────────┴──────────┴────────────────────────┘
```

## Dream State Delta

```
CURRENT STATE          THIS PLAN (05-03)           12-MONTH IDEAL
Store + pipeline   →   VAL tab with per-source  →  Auto-validate on
exist but no UI.       ✓/⚠/○ badges, violation     debounce, fitView
User has no            list, clickable canvas       zoom to node,
feedback on            highlight, stale banner.     cross-source summary.
correctness.
```
