# Plan Review — 05-03 SHACL UI Wiring
**Date:** 2026-03-30
**Mode:** HOLD SCOPE
**Plan:** `.planning/phases/05-shacl-validation/05-03-PLAN.md`
**Phase goal:** Validate all source mappings against master ontology constraints; surface errors per source.

---

## Completion Summary

```
+====================================================================+
|            PLAN REVIEW — COMPLETION SUMMARY                        |
+====================================================================+
| Mode selected        | HOLD SCOPE                                  |
| System Audit         | uiStore + validationStore pre-implemented;  |
|                      | DECISIONS.md DEC-001/002 (prior skip noted) |
| Step 0               | Scope accepted; 8 files all necessary       |
| Section 1  (Arch)    | 1 issue — onValueChange cast (fixed in plan)|
| Section 2  (Errors)  | 4 error paths mapped, 0 critical gaps       |
| Section 3  (Security)| 0 issues                                    |
| Section 4  (Data/UX) | 1 critical — E2E test 7 locator (fixed)     |
| Section 5  (Tests)   | Diagram produced, 1 gap (unit tests)        |
| Section 6  (Future)  | Reversibility: 5/5, debt items: 1 (minor)  |
+--------------------------------------------------------------------+
| Section 7  (Eng Arch)| 1 critical — SourceNode Zustand selector    |
| Section 8  (Code Ql) | 0 DRY violations, 0 over/under-eng          |
| Section 9  (Eng Test)| Test diagram produced, 2 gaps               |
| Section 10 (Perf)    | 2 issues found, 0 High severity             |
+--------------------------------------------------------------------+
| PLAN.md updated      | 2 truths added, 0 artifacts added           |
| CONTEXT.MD updated   | 6 decisions locked, 5 items deferred        |
| Error/rescue registry| 4 methods, 0 CRITICAL GAPS                  |
| Failure modes        | 4 total, 0 CRITICAL GAPS                    |
| Delight opportunities| 1 noted (VAL tab count badge — deferred)    |
| Diagrams produced    | 4 (arch dependency, data flow, state machine, test coverage) |
| Unresolved decisions | 0                                           |
+====================================================================+
```

---

## Key Findings

### Pre-implementation state (executor must read)
- `src/store/uiStore.ts`: `'VAL'` already in `RightTab` union — **skip Task 1 step 1**
- `src/store/validationStore.ts`: `highlightedCanvasNodeId`, setter, and `reset()` clearing already present — **skip Task 2 store block**
- `src/components/layout/RightPanel.tsx` line 88: `onValueChange` cast missing `'VAL'` — **must fix**

### Critical fixes applied to plan
1. **SourceNode boolean selector** (Section 7): Changed from string selector to `s => s.highlightedCanvasNodeId === id` to prevent N SourceNode re-renders per highlight event.
2. **E2E Test 7 locator** (Section 4): `[data-id="{nodeId}"]` is React Flow's wrapper, not SourceNode's `<div>`. Ring class is on `[data-id="{nodeId}"] > div` (first child).
3. **Removed "allow flakiness"** from verify: Badge state is synchronous Zustand; flakiness indicates a test bug, not a timing issue.
4. **SourceStatusBadge selectors** (Section 10): Two separate `useValidationStore` calls instead of object destructure.

---

## Architecture Diagram

```
DEPENDENCY GRAPH (new wiring added by 05-03):

  validationStore ←── ValidationPanel (results, stale, error, loading)
  validationStore ←── SourceSelector  (results, lastRun → badge)
  validationStore ←── SourceNode      (highlightedCanvasNodeId === id → ring)
  validationStore ←── OntologyCanvas  (highlightedCanvasNodeId → fitView)
  sourcesStore    ←── ValidationPanel (activeSourceId)
  uiStore         ←── RightPanel      (activeRightTab includes 'VAL')

  ValidationPanel.onClick → validationStore.setHighlightedCanvasNodeId
                          → sourcesStore.setActiveSourceId
```

## Validation Lifecycle State Machine

```
     [no source active]
           │
     [source selected]
           │
    ┌──────▼──────┐
    │  NOT_RUN    │ results[id]=undefined, stale=false
    └──────┬──────┘
           │ click Validate
    ┌──────▼──────┐
    │   LOADING   │ loading=true
    └──────┬──────┘
           │ success / error
    ┌──────▼──────────────┐
    │ VALID / VIOLATIONS  │ results[id]=[], stale=false
    └──────┬──────────────┘
           │ mapping change
    ┌──────▼──────┐
    │    STALE    │ stale=true, results remain
    └──────┬──────┘
           │ click Validate
         (back to LOADING)
```

## Test Coverage Diagram

```
┌─────────────────────────────────────────────────────────┐
│            TEST COVERAGE DIAGRAM                        │
├────────────────────────────┬───────────┬────────────────┤
│ CODEPATH                   │ TEST TYPE │ STATUS         │
├────────────────────────────┼───────────┼────────────────┤
│ VAL tab presence           │ E2E       │ ✓ Test 1       │
│ Not-yet-run state          │ E2E       │ ✓ Test 2       │
│ Validate button            │ E2E       │ ✓ Test 3       │
│ Valid result state         │ E2E       │ ✓ Test 4       │
│ Stale banner               │ E2E       │ ✓ Test 5       │
│ Badge ○→✓ transition       │ E2E       │ ✓ Test 6       │
│ Badge ⚠ state              │ E2E       │ ✗ DEFERRED     │
│ Violation ring (E2E)       │ E2E       │ ⚠ Test 7*      │
│ ValidationPanel 6 states   │ Unit      │ ✗ Deferred     │
│ Error state (store throws) │ Unit      │ Noted in ctx   │
└────────────────────────────┴───────────┴────────────────┘
* locator fix applied in plan
```

## What Already Exists

- `uiStore.ts`: VAL tab type complete
- `validationStore.ts`: full store shape including highlight fields
- `OntologyCanvas.tsx`: `rfInstance` ref pattern established — fitView already used
- `SourceSelector.tsx`: pill layout established — badge insertion point is between name button and delete button

## Dream State Delta

This plan leaves the system with a complete validation feedback loop: validate → see violations per source → click violation → canvas highlights the offending node. 12-month ideal would add inline fix suggestions and cross-source summary, both deferred.
