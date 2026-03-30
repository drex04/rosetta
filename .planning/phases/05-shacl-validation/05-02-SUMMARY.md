---
phase: 05-shacl-validation
plan: 02
subsystem: validation-store
tags: [zustand, shacl, tdd]
requires: [05-01]
provides:
  - "useValidationStore — full runValidation, setStale, reset, setHighlightedCanvasNodeId (validationStore.ts)"
  - "subscribeValidationToMappings() — exported side-effect subscription wired in App.tsx"
  - "Validate button in Header — outline variant, disabled when loading, amber ring when stale"
affects: [05-03]
tech-stack:
  added: []
  patterns: [Zustand ephemeral store, cross-store subscription, Phosphor spinner animation]
key-files:
  created:
    - src/__tests__/validationStore.test.ts
  modified:
    - src/store/validationStore.ts
    - src/App.tsx
    - src/components/layout/Header.tsx
key-decisions:
  - "validationStore is ephemeral — no IDB persist — results lost on reload by design"
  - "subscribeValidationToMappings exported from store, called once in App.tsx useEffect with cleanup"
  - "runValidation early-returns if get().loading to prevent double-click races"
  - "highlightedCanvasNodeId cleared to null on each runValidation completion for plan 05-03 compatibility"
requirements-completed: [REQ-35]
test_metrics:
  tests_passed: 9
  tests_failed: 0
  tests_total: 9
  coverage_line: null
  coverage_branch: null
  test_files_created: [src/__tests__/validationStore.test.ts]
  spec_tests_count: 0
duration: ~8m
completed: "2026-03-30T21:00:00.000Z"
---

## What Was Built

- **validationStore.ts** — replaced stub `runValidation` with full implementation: iterates all sources, calls `validateSource(source, ontologyNodes, getMappingsForSource(sourceId))`, catches errors into `store.error`, populates `results` keyed by `sourceId`, resets `stale`/`loading` on completion. All existing fields preserved (`highlightedCanvasNodeId`, `setHighlightedCanvasNodeId`).
- **subscribeValidationToMappings()** — exported function that subscribes `useMappingStore` changes to `setStale(true)`. Returns unsubscribe handle.
- **App.tsx** — added `useEffect(() => { const unsub = subscribeValidationToMappings(); return unsub }, [])` for mount/unmount lifecycle.
- **Header.tsx** — Validate button added before the Project dropdown: `variant="outline"`, `disabled={loading}`, amber ring when `stale && !loading`, `SpinnerGapIcon animate-spin` while loading, `CheckCircleIcon` at rest.

## Test Results

```
✓ setStale sets stale to true
✓ setStale sets stale back to false
✓ reset clears results, stale, and highlightedCanvasNodeId
✓ setHighlightedCanvasNodeId sets and clears
✓ subscribeValidationToMappings sets stale=true when mappingStore changes
✓ runValidation returns early without changing state if already loading
✓ runValidation sets error string and loading:false when validateSource throws
✓ runValidation does not crash when validateSource throws a non-Error
✓ runValidation populates results and clears loading/stale on success
9/9 passed
```

## Issues Encountered

None.

## Deviations from Plan

None — implemented exactly as specified.
