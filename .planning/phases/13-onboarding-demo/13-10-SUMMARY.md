---
plan: 13-10
title: Onboarding Improvements
status: complete
completed: 2026-04-09
test_metrics:
  tests_passed: 337
  spec_tests_count: 0
---

# Summary: Plan 13-10

## What Was Built
- **Welcome modal** (`OnboardingModal.tsx`): blocks overlay/escape close; two CTAs: "Load Example & Start Tour" and "Start Fresh"
- **loadExampleProject()** (`src/lib/exampleProject.ts`): resets all stores, seeds NATO air defense scenario; extracted from existing Header logic
- **Tour step reorder**: Transform & Export now appears before Validate
- **Tab switching**: `TourProvider` calls `setActiveRightTab` on `step:before` event for each step
- **Tour fixes**: all steps have `disableBeacon: true`; SPARQL mention removed from MAP step; ontology step references "ONTOLOGY tab" correctly; final "Start Your Own Project" step added targeting `[data-tour="project-menu"]`
- **Header**: standalone Tour button removed; Help button now opens tour; project menu button gets `data-tour="project-menu"`
- **uiStore**: `tourRunning` initial value changed to `false` (modal handles first-visit detection)

## Files Created
- `src/lib/exampleProject.ts`
- `src/components/onboarding/OnboardingModal.tsx`

## Files Modified
- `src/App.tsx` — showModal state, OnboardingModal mounted
- `src/store/uiStore.ts` — tourRunning init changed to false
- `src/components/onboarding/tourSteps.ts` — reordered, fixed, disableBeacon, final step
- `src/components/onboarding/TourProvider.tsx` — tab switching on step:before
- `src/components/layout/Header.tsx` — Tour button removed, Help→tour, data-tour attr

## Key Decision
`disableBeacon` not in react-joyride's `Step` type — used `type StepWithBeacon = Step & { disableBeacon?: boolean }` to avoid TS errors.

## Verification
- Build: PASS
- Tests: 337/337
