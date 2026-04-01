---
phase: 09-bug-fixes-ui-ux-overhaul
plan: 02
status: complete
completed_at: "2026-04-01T14:00:00.000Z"
test_metrics:
  passed: 261
  failed: 0
  spec_tests_count: 0
---

# Plan 09-02 Summary: UI/UX Overhaul

## Objective

Overhaul the panel UI: rename INPUT→SOURCE tab, redesign tab bar selected state, restyle source selector bar, add resizable RDFS pane, relocate Validate button and GitHub icon, surface dataTypes in MAP tab, show per-source SHACL violations, and add inline RML/YARRRML previews in OUTPUT tab.

## Tasks Completed

| Task | Status | Commit |
|------|--------|--------|
| 1: INPUT→SOURCE tab rename + primary selected state | ✅ | 5fb11b3, 597c14c |
| 2: Source bar neutral styling + Add Source button | ✅ | 20ffb4b |
| 3: Resizable RDFS pane in SOURCE tab | ✅ | 5a9b20f |
| 4: Validate→SHACL tab, GitHub→Header, SavedStatus right | ✅ | ffc3716 |
| 5: MAP dataType display + SHACL per-source violations | ✅ | 185e328 |
| 6: OUTPUT inline RML/YARRRML previews + E2E tests | ✅ | e71b967 |

## Key Files Created/Modified

- `src/store/uiStore.ts` — `RightTab` type: `'INPUT'` → `'SOURCE'`
- `src/components/layout/RightPanel.tsx` — `data-[state=active]:bg-primary` selected state on all tabs
- `src/components/layout/SourceSelector.tsx` — neutral styling, labeled dashed "Add Source" button, validation indicators removed
- `src/components/panels/SourcePanel.tsx` — pointer-drag resizable RDFS pane (min 80px, max 600px, default 200px)
- `src/components/layout/Header.tsx` — Validate button removed; GitHub icon added far right
- `src/components/layout/StatusBar.tsx` — save status moved to right side, text-xs sizing
- `src/components/panels/ValidationPanel.tsx` — Validate button in panel header; per-violation `<details>` elements
- `src/components/panels/MappingPanel.tsx` — dataType range display (`xsd:float → xsd:integer`) per mapping row
- `src/lib/mappingHelpers.ts` — NEW: `getPropRange()` pure helper
- `src/components/panels/OutputPanel.tsx` — collapsible RML/YARRRML `<details>` previews in Export tab
- `src/__tests__/mapping-datatype.test.ts` — NEW (5 tests)
- `e2e/ui-ux.spec.ts` — NEW (3 Playwright smoke tests)

## Verification

- `npm run build` — zero TypeScript errors ✅
- `npx vitest run` — 261 passed, 0 failed ✅

## Must-Haves Coverage

- ✅ SOURCE tab label visible, selected tab has filled primary background
- ✅ Source bar neutral gray, labeled Add Source button, no ✓/⚠/○ chips
- ✅ RDFS pane drags to resize in SOURCE tab
- ✅ Validate button in SHACL tab only; GitHub in Header; Saved on right of StatusBar
- ✅ MAP tab shows xsd datatype on each side of direct mapping rows
- ✅ SHACL violations expandable per source
- ✅ OUTPUT export shows collapsible RML and YARRRML previews
