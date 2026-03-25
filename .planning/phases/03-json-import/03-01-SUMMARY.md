---
phase: 03-json-import
plan: 01
status: complete
requirements-completed:
  - REQ-17
  - REQ-18
commits:
  - 76cc0b9
  - afba04f
  - c0b73a2
  - 260f491
---

## What Was Built

Hardened the source store, built the SourceSelector pill bar, extended IDB persistence to cover sources.

## Artifacts

- `src/store/sourcesStore.ts` — Added `updateSource(id, patch)` action, `generateSourceId()` helper, atomic `removeSource` (activeSourceId updated in same `set()` call)
- `src/lib/rdf.ts` — Replaced fixed `{x:0,y:0}` positions with column layout; exported `COLUMN_X_MASTER=0`, `COLUMN_X_SOURCE=-520`, `COLUMN_SPACING=180`
- `src/components/layout/SourceSelector.tsx` — Functional pill bar: add/rename/delete inline, Esc+blur guard (RD-12), empty-name revert (RD-05), AlertDialog for non-empty source deletion (RD-13), unique auto-naming (RD-14)
- `src/hooks/useAutoSave.ts` — Extended to subscribe to both ontologyStore and sourcesStore; saves sources[]+activeSourceId to single IDB key; load path restores sources on mount
- `src/types/index.ts` — `ProjectFile.sources` typed as `Source[]`; added `activeSourceId?` field

## Issues Encountered

None. All spec gate checks passed.

## Decisions Made

- Used existing `ConfirmDialog` component for deletion confirmation (AlertDialog from Radix not installed separately; ConfirmDialog provides equivalent UX)
- Column layout "only when no saved position" responsibility delegated to caller (noted with comment in rdf.ts:parseTurtle)
