---
id: 13-03
phase: 13
title: Interaction Bug Fixes
status: complete
commit: 2272a86
test_metrics:
  tests_passed: 337
  tests_failed: 0
  build: pass
  spec_tests_count: 0
---

# Summary: Plan 13-03 — Interaction Bug Fixes

## What Was Built

Five targeted interaction bug fixes across canvas nodes and the LOAD panel.

## Tasks Completed

- **T1 — Source LOAD panel remount on source switch:** Added `key={activeSourceId ?? 'none'}` to `<SourcePanel>` in `RightPanel.tsx` and imported `activeSourceId` from `useSourcesStore`. Switching sources now immediately shows updated name and format badge.

- **T2 — URI input closing node edit form:** Removed per-input `onBlur` from header edit forms in `ClassNode.tsx` and `SourceNode.tsx`. Moved commit logic to container-level `onBlur` with `relatedTarget` guard so focus moving between label and URI inputs no longer closes the form.

- **T3 — Property double-click guard:** Added early-return guard in `handleNodeDoubleClick` (OntologyCanvas.tsx) that bails out when the click target is inside a `[data-property-row]` element. Added `data-property-row` attribute to property row divs in `ClassNode.tsx` and `SourceNode.tsx`. Double-clicking a property now opens property inline edit without triggering header edit.

- **T4 — Right-click property rename:** Added `propRenameTrigger` and `onPropContextMenu` fields to `ClassData`/`SourceData` types in `src/types/index.ts`. Wired property context menu in `OntologyCanvas.tsx` (`propMenu` state, `handleStartPropEdit` callback, `onPropContextMenu` in augmented nodes, dropdown JSX). Added property row `onContextMenu` handlers in `ClassNode.tsx` and `SourceNode.tsx` that stop propagation and call `onPropContextMenu`. Right-clicking a property now shows a "Rename Property" option that opens inline property edit.

- **T5 — Larger handle clickable area:** Replaced `!w-2.5 !h-2.5` with `!w-4 !h-4` on all handles in `ClassNode.tsx` and `SourceNode.tsx`. Handles are now 16×16px.

## Files Modified

- `src/components/layout/RightPanel.tsx`
- `src/components/nodes/ClassNode.tsx`
- `src/components/nodes/SourceNode.tsx`
- `src/components/canvas/OntologyCanvas.tsx`
- `src/types/index.ts`

## Verification

- Tests: 337/337 passed
- Build: clean (pre-existing chunk size warning only)
- Lint: clean (prettier ran via pre-commit hook)

## Issues Encountered

None. LSP diagnostics appeared stale after subagent edits but build confirmed no actual errors (expected per CLAUDE.md: "LSP diagnostics lag after file changes").
