---
plan: 13-05
title: Technical Foundations
status: complete
completed: 2026-04-07
commits:
  - 2918906
  - cd5e4d1
test_metrics:
  tests_passed: 337
  tests_failed: 0
  spec_tests_count: 0
---

# Summary — Plan 13-05: Technical Foundations

## What Was Built

- **uiStore persist removed:** Converted from Zustand `persist` middleware to plain `create<UiState>()`. Added `activeRightTab` to `ProjectFile` type, IDB snapshot, and project export/import so tab state persists correctly across sessions.
- **Formula evaluation:** Added `evaluate(expr, record)` to `formulaParser.ts`. Wired into `rmlExecute.ts` to dry-run validate formula mappings and emit per-source count warnings.
- **Bundle code splitting:** Added `manualChunks` in `vite.config.ts` splitting N3.js, jsonld, CodeMirror, and RML mapper into separate vendor chunks. Converted `SourcePanel` and `TurtleEditorPanel` to `React.lazy` with Suspense fallbacks.

## Files Modified
- `src/store/uiStore.ts` — removed persist, exported RightTab type
- `src/types/index.ts` — added `activeRightTab?: RightTab` to ProjectFile
- `src/components/layout/Header.tsx` — activeRightTab in export/import
- `src/hooks/useAutoSave.ts` — activeRightTab in IDB snapshot + restore
- `src/lib/formulaParser.ts` — added `evaluate()` function
- `src/lib/rmlExecute.ts` — formula validation with count-based warning format
- `vite.config.ts` — manualChunks vendor splitting
- `src/components/layout/RightPanel.tsx` — lazy SourcePanel + TurtleEditorPanel
- `src/components/panels/ValidationPanel.tsx` — lazy TurtleEditorPanel

## Issues Encountered
- Formula warning format needed to include count ("1 formula mapping") to match existing test expectations — fixed in follow-up commit.

## Verification
- Build: ✅ clean
- Tests: ✅ 337/337 passed
- Lint: pre-existing error in `src/lib/rdf.ts` (no-unexpected-multiline at line 256) — not introduced by this phase
