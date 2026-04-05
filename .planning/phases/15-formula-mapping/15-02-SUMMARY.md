---
phase: 15-formula-mapping
plan: 02
subsystem: ui
tags: [formula, mapping-panel, form-builder, formula-bar]
requires:
  - phase: 15-01
    provides: "formula kind, formulaExpression field, parseAndValidate, FnO emitter"
provides:
  - "3-tier formula editor (Form / Formula / RML) in MappingPanel"
  - "FormBuilder sub-component with function picker and dynamic arg inputs"
  - "FormulaBar sub-component with live validation green/red badge"
  - "Tier reset via key={mapping.id} on selection change"
  - "MappingGroup 2-tier UI (Formula / RML)"
affects: []
tech-stack:
  added: []
  patterns:
    - "key prop for state reset (no useEffect for tier reset)"
    - "Inline sub-components (FormBuilder, FormulaBar, MappingDetail, GroupDetail)"
key-files:
  created:
    - src/__tests__/MappingPanel.test.tsx
  modified:
    - src/components/panels/MappingPanel.tsx
key-decisions:
  - "Plain <input> for FormulaBar (CodeMirror custom language deferred)"
  - "Tier reset via key={mapping.id} — unmount/remount without useEffect"
  - "FormBuilder guards emitUpdate for all-empty args to prevent invalid intermediate state"
  - "GroupDetail shows Formula/RML only (no Form builder for groups in plan 02)"
requirements-completed:
  - REQ-119
  - REQ-120
  - REQ-121
  - REQ-122
test_metrics:
  tests_passed: 336
  tests_failed: 0
  tests_total: 336
  coverage_line: null
  coverage_branch: null
  test_files_created:
    - src/__tests__/MappingPanel.test.tsx
  spec_tests_count: 0
duration: ~8min
completed: "2026-04-05T18:11:00Z"
---

## What Was Done

- Added `FormBuilder` inline component: function picker (CONCAT/UPPER/LOWER/TRIM/REPLACE), arg inputs with add/remove for variadic CONCAT, arity enforcement, "too complex" fallback for nested expressions
- Added `FormulaBar` inline component: plain text input, live `parseAndValidate` validation, green "valid" / red error badge
- Added `MappingDetail` container with 3-tier toggle [Form | Formula | RML] wrapped in `key={mapping.id}` for state reset
- Added `GroupDetail` container with 2-tier toggle [Formula | RML] using group's `formulaExpression`
- RML tier reuses existing snippet pane (FnO Turtle from plan 01's emitter)
- Wrote 8 component tests covering tier visibility, store updates, validation badges, bidirectional sync, and tier reset

## Decisions Made

| Decision | Rationale | Alternatives |
|----------|-----------|--------------|
| Plain input for FormulaBar | CodeMirror DSL extension out of scope for plan 02 | CodeMirror with syntax highlighting (deferred) |
| key prop for tier reset | No useEffect needed; idiomatic React | useEffect with selectedMappingId dep |
| Inline sub-components | Consistent with existing MappingPanel style | Separate files |

## Deviations from Plan

- [Rule 1] `emitUpdate` guard added: skips store write when all CONCAT args are empty to avoid persisting `CONCAT(, )` invalid state

## Issues Encountered

None — all 8 tests passed on first run, build clean.

## Next Phase Readiness

Phase 15 is complete. All formula mapping requirements (REQ-116–REQ-122) delivered.

## Test Results

- **Tests:** 336/336 passing
- **Coverage:** not configured
- **Test files created:** src/__tests__/MappingPanel.test.tsx (8 tests)
- **Spec-generated tests:** no
