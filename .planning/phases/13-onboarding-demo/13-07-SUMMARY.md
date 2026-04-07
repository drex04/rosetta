---
plan: 13-07
title: Onboarding Tour
status: complete
completed: 2026-04-07
commits:
  - e7f1531
test_metrics:
  tests_passed: 337
  tests_failed: 0
  spec_tests_count: 0
---

# Summary — Plan 13-07: Onboarding Tour

## What Was Built

- **react-joyride installed** (v3 — breaking changes from v2 adapted: named export `{ Joyride }`, `onEvent` prop, `EventData` type, `options` object API)
- **Tour steps:** 7-step workflow tour in `tourSteps.ts` covering: load sources → add source → ontology tab → canvas → mapping → validation → transform/export
- **data-tour attributes** added to: LOAD/BUILD/MAP/FUSE/CHECK tab triggers in RightPanel, Add Source button in SourceSelector, canvas wrapper in OntologyCanvas/App
- **TourProvider:** `src/components/onboarding/TourProvider.tsx` — reads `tourRunning` from uiStore, sets `rosetta-tour-seen` in localStorage on finish/skip
- **uiStore:** Added `tourRunning: boolean` (initializes from localStorage check) and `setTourRunning` action
- **Header tour button:** Compass icon button with tooltip — triggers `setTourRunning(true)` for returning visitors to replay

## Files Created
- `src/components/onboarding/TourProvider.tsx`
- `src/components/onboarding/tourSteps.ts`

## Files Modified
- `src/store/uiStore.ts` — tourRunning state + setTourRunning action
- `src/App.tsx` — renders `<TourProvider />`, data-tour="canvas" attribute
- `src/components/layout/RightPanel.tsx` — data-tour attributes on tab triggers
- `src/components/layout/SourceSelector.tsx` — data-tour="add-source" on Add button
- `src/components/layout/Header.tsx` — Tour button with CompassIcon
- `package.json` / `package-lock.json` — react-joyride dependency

## Verification
- Build: ✅ clean
- Tests: ✅ 337/337 passed
