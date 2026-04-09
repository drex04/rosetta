---
plan: 16-01
phase: 16
title: Onboarding, Edge & MAP Tab Bug Fixes
status: completed
commit: be1ca00
tests_passed: 337
tests_total: 337
build: clean
---

# Summary: Plan 16-01

## What Was Built

Nine targeted bug fixes across 5 files. All 9 truths from the plan are now satisfied.

## Tasks Completed

| Task | File | Status |
|------|------|--------|
| 1 — Start Fresh resets all stores | src/App.tsx | ✅ |
| 2 — Tour auto-start: modal closed before loadExampleProject | src/App.tsx | ✅ |
| 3 — EdgeContextMenu uses mappingId not edgeId | src/components/canvas/EdgeContextMenu.tsx | ✅ |
| 4 — ObjectProperty label stored in data.label | src/components/canvas/EdgeContextMenu.tsx | ✅ |
| 5 — Full kind names on mapping edges | src/components/edges/MappingEdge.tsx | ✅ |
| 6 — RML tier removed from formula MAP tab | src/components/panels/MappingPanel.tsx | ✅ |
| 7 — Delete X visually destructive at rest | src/components/panels/MappingPanel.tsx | ✅ |
| 8 — formulaFn lifted to MappingDetail (stable across tab switches) | src/components/panels/MappingPanel.tsx | ✅ |
| 9 — Germany mappings seeded in example project | src/lib/exampleProject.ts | ✅ |

## Key Decisions

- **EdgeContextMenu data cast as `any`**: `updateEdge` expects a strict union type `(SubclassEdgeData | ObjectPropertyEdgeData) & Record<string,unknown>` but `menu.edgeData` is typed as `Record<string,unknown>`. Used `as any` cast since the runtime data is correct — cleaner than importing edge data types into the menu component.
- **Germany URI base**: `deriveUriPrefix("Germany")` → `src_germany_`. `breite`/`laenge` are nested under `position` → `Position` node; `zeitstempel`/`geschwindigkeit_kmh` are on the root `ErkannteZiele` node.
- **Test updated**: MappingPanel test 7 ("RML tier shows font-mono") repurposed to verify RML tab is absent.

## Verification

- `npm run build`: ✅ 0 TypeScript errors, build successful
- `npm test`: ✅ 337/337 tests pass (2 tests updated to reflect removed RML tab)
