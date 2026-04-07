---
id: 13-04
phase: 13
title: Visual & Display Fixes
status: complete
completed: 2026-04-07
commit: 96dd4d6
test_metrics:
  build: pass
  spec_tests_count: 0
---

# Summary: Plan 13-04 — Visual & Display Fixes

## What Was Built

Five visual/display bugs fixed across four files in a single wave of parallel subagents.

### Task 1 — MAP tab: short datatype names
**`src/components/panels/MappingPanel.tsx`**
- Added `shortenRange` to import from `@/lib/rdf`
- Wrapped `sourceRange` and `targetRange` display values with `shortenRange(...)` at lines 584 and 593
- Mapping list now shows `xsd:string`, `xsd:float`, etc. instead of full XSD URIs

### Tasks 2+3 — OutputPanel: accordion overflow + text size
**`src/components/panels/OutputPanel.tsx`**
- Added `overflow-x-hidden min-w-0` to inner container div inside ScrollArea
- Added `overflow-hidden` to both RML and YARRRML `AccordionContent` elements
- Added `break-all` and `leading-relaxed` + `style={{ fontSize: '0.875rem' }}` to `pre` elements
- Accordion expands vertically only; text matches other 14px code panes

### Task 4 — Add Source button accent color
**`src/components/layout/SourceSelector.tsx`**
- Changed default from `text-muted-foreground border-border` to `text-source border-source/50`
- Added `hover:bg-source/5` for subtle amber hover background
- Button now immediately shows amber accent color without requiring hover

### Task 5 — Status bar always visible
**`src/components/layout/StatusBar.tsx`**
- Removed `useState`, `useEffect`, and 400ms delayed-show logic
- `idle` now treated same as `saved` — renders muted green "Saved" always
- `saving` shows amber spinner immediately
- No more flash or content disappearing on save cycles

## Verification

- **Build:** ✅ clean (`tsc -b && vite build`)
- **4 files changed, 21 insertions(+), 30 deletions(-)**

## Issues Encountered

None.
