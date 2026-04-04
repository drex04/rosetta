---
phase: 12-onboarding-demo
plan: 01
status: complete
commit: 57a39cc
files_modified:
  - src/components/ui/about-dialog.tsx
  - src/components/layout/AppLayout.tsx
  - src/components/layout/Header.tsx
  - e2e/about-dialog.spec.ts
  - src/App.tsx
test_metrics:
  build: pass
  e2e: 8/8 pass
  spec_tests_count: 8
---

## What was built

5-slide onboarding modal (REQ-72) that auto-opens on first visit and is re-openable from the header About button.

## Files created/modified

- **`src/components/ui/about-dialog.tsx`** — Self-contained 5-slide dialog with CSS-only opacity/translateY transitions, 5 inline SVG visuals (SilosVisual, OntologyVisual, StandardsVisual, SpeedVisual, DemoVisual), progress dot navigation, Skip/Back/Next/Get Started buttons, and accent-color-per-slide badge.
- **`src/components/layout/AppLayout.tsx`** — New wrapper component owning `aboutOpen` state, first-visit localStorage check (`rosetta-onboarding-v1`), and `handleAboutClose` callback that sets the flag.
- **`src/components/layout/Header.tsx`** — Added `onAboutClick: () => void` prop and wired it to the About button.
- **`src/App.tsx`** — Replaced bare `<Header />` with `<AppLayout>` wrapper.
- **`e2e/about-dialog.spec.ts`** — 8 E2E tests covering auto-open, repeat-visit suppression, slide navigation, dot navigation, Skip, Get Started, and About button re-open.

## Verification

- `npm run build` — pass (0 errors)
- `npx playwright test e2e/about-dialog.spec.ts` — 8/8 pass

## Must-haves coverage

- ✅ Clicking 'About' in the header opens the onboarding dialog
- ✅ First-time visitors see the dialog auto-open on page load
- ✅ Dialog shows 5 slides with prev/next navigation and animated transitions
- ✅ Progress dots are clickable and reflect the active slide
- ✅ Closing via 'Get Started', 'Skip', or X sets localStorage rosetta-onboarding-v1=seen and prevents future auto-opens

## Issues Encountered

None. LSP showed stale diagnostics after parallel agent writes — actual build was clean throughout.

## Notes

- Progress dots use `aria-label="Go to slide N"` which made E2E selectors clean
- Rapid Next-click test needed per-slide heading assertions as gates to avoid racing the 250ms CSS animation
- `AppLayout` wraps App's children so `ConfirmDialog` and `Toaster` remain in `App.tsx` (no disruption to existing confirm flow)
