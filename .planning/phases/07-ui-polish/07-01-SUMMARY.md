---
phase: 07-ui-polish
plan: 01
status: complete
commit: b08b8e4
build: pass
tests: 237 pass / 0 fail (unit); e2e excluded from vitest per project convention
subsystem: ui
tags: [tabs, sparql, undo, mobile]
provides:
  - "Tabs renamed INPUT/ONTOLOGY/MAP/OUTPUT/VALIDATE with shadcn default active styling"
  - "SPARQL auto-regeneration on mapping field changes (300ms debounce)"
  - "Mapping invalidation with undo toast when source/ontology properties deleted"
  - "OUTPUT tab reduced to fused+export subtabs; ONTOLOGY tab has Download .ttl button"
  - "Template kind shows prop1/prop2 labels; minimap hidden on mobile (<640px)"
key-files:
  modified:
    - src/store/uiStore.ts
    - src/components/layout/RightPanel.tsx
    - src/components/panels/MappingPanel.tsx
    - src/components/panels/OutputPanel.tsx
    - src/components/panels/TurtleEditorPanel.tsx
    - src/store/mappingStore.ts
    - src/components/canvas/OntologyCanvas.tsx
    - src/App.tsx
  created:
    - src/components/ui/sonner.tsx
requirements-completed:
  - REQ-51
  - REQ-52
  - REQ-53
  - REQ-54
  - REQ-55
  - REQ-56
  - REQ-57
test_metrics:
  tests_passed: 237
  tests_failed: 0
  tests_total: 237
  spec_tests_count: 0
duration: ~15min
completed: "2026-04-01T07:15:00.000Z"
---

## Objective

Quick-win polish pass: fix mapping bugs (stale SPARQL, no invalidation cascade), rename and restyle tabs, restructure OUTPUT tab, and add mobile minimap hiding.

## What Was Built

### Task 1: Rename and restyle tabs
- `RightTab` type updated in `uiStore.ts`: `SRC→INPUT`, `ONTO→ONTOLOGY`, `OUT→OUTPUT`, `VAL→VALIDATE`
- All `TabsTrigger` and `TabsContent` values updated in `RightPanel.tsx`
- Removed `data-[state=active]:bg-muted` override; shadcn default active styling now applies
- Tab text bumped from `text-xs` to `text-sm`
- All aria-labels updated; store.test.ts updated to use new values

### Task 2: SPARQL auto-regeneration and template labels
- Removed "Regenerate" button from MappingPanel SPARQL editor header
- Added `useEffect` with 300ms debounce watching all kind-specific fields; calls `generateConstruct` and `updateMapping` when result differs
- Template kind section now shows `{prop1} = <sourcePropLocalName>` and `{prop2} = <targetPropLocalName>` labels above the pattern input

### Task 3: OUTPUT tab restructure + ONTOLOGY export
- Removed `ontology` subtab and all associated components (TurtleView, JsonLdView, OntologyFormat) from OutputPanel
- Default subtab changed to `'fused'`; only `fused` and `export` remain
- TurtleEditorPanel gained a "Download .ttl" button with `downloadBlob` helper

### Task 4: Mapping invalidation with undo toast
- Installed `sonner`; created `src/components/ui/sonner.tsx` wrapper; mounted `<Toaster />` in App.tsx
- `mappingStore` gained `removeInvalidMappings(validPropertyUris)` and `undoLastRemoval()` actions with internal `_undoBuffer`
- `OntologyCanvas.handleDeleteNode` now computes valid URI set post-deletion and fires toast if mappings removed

### Task 5: Mobile minimap hide
- `<MiniMap />` wrapped in `<div className="hidden sm:block">` in OntologyCanvas.tsx

## Issues Encountered

None. Build clean; 237 unit tests pass.
