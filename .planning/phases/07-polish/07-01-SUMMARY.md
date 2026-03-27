---
phase: 07-polish
plan: 01
status: complete
completed: 2026-03-27
requirements-completed:
  - REQ-55
commits:
  - 98b966b feat(07-01): remove save status and GitHub button from Header
  - 21392bb feat(07-01): add StatusBar component and update App.tsx root layout
  - 488e903 feat(07-01): resizable and collapsible right panel
  - 9389f31 test(07-01): add Playwright layout tests for status bar, header, and right panel
  - dd9efbc refactor(07-01): remove out-of-scope useSourcesStore from RightPanel; fix mobile test state ordering
---

## What Was Built

**StatusBar component** (`src/components/layout/StatusBar.tsx`): New `<footer>` strip at the bottom of the viewport — h-6, border-t, save status indicator (left) with Saving/Saved/Error states at text-[11px], GitHub icon-only button (right) with aria-label.

**App.tsx root layout**: Changed from `h-screen` to `h-dvh` for iOS Safari address-bar compatibility. Removed the old `h-px bg-border` divider. StatusBar wired as last child with `saveStatus` prop. Header call site cleaned of `saveStatus` prop.

**Header cleanup** (`src/components/layout/Header.tsx`): Removed save status spans, GitHub button, GithubLogoIcon/CircleNotchIcon/CheckCircleIcon/WarningIcon imports, SaveStatus type import, and HeaderProps interface. Header now accepts no props.

**Resizable + collapsible RightPanel** (`src/components/layout/RightPanel.tsx`): Full rewrite of width/collapse management. Three layout modes: collapsed strip (`w-10`), mobile expanded (full-width absolute overlay `z-20`), desktop expanded (`shrink-0` + inline width). Collapse/expand via CaretRightIcon/CaretLeftIcon buttons with proper aria-labels. Drag-to-resize via pointer events on a 4px left-edge handle (desktop only, min 260px / max 60vw). Reactive mobile detection via resize listener (breakpoint: `window.innerWidth < 640`). `aria-label="Right panel"` on aside for Playwright locators.

**Playwright layout tests** (`e2e/layout.spec.ts`): 5 tests covering status bar visibility, header cleanup verification, desktop collapse/expand, desktop drag-resize, and mobile full-width expand.

## Verification

```
npm run build    → ✓ zero TS errors
npx playwright test e2e/layout.spec.ts → 5/5 passed
```

## Artifacts

| File | Status |
|------|--------|
| `src/components/layout/StatusBar.tsx` | Created |
| `src/components/layout/Header.tsx` | Modified (save status + GitHub removed) |
| `src/App.tsx` | Modified (h-dvh, StatusBar wired) |
| `src/components/layout/RightPanel.tsx` | Modified (collapse + resize) |
| `e2e/layout.spec.ts` | Created (5 tests) |

## Issues Encountered

None — build clean, all tests pass.

## Spec Gate Notes

PASS. Minor fix applied: removed out-of-scope `useSourcesStore` coupling from RightPanel (YAGNI — `SourcePanel key` prop not in spec). Mobile test state ordering fixed (clear IDB before goto, not after).
