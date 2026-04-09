---
plan: 13-09
title: Edge Context Menus
status: complete
completed: 2026-04-09
test_metrics:
  tests_passed: 337
  spec_tests_count: 0
---

# Summary: Plan 13-09

## What Was Built
- Double-click or right-click on any edge opens a context menu at cursor position
- Mapping edges: 6-kind picker (direct/template/constant/typecast/language/formula) + Delete
- SubclassEdge: "Change to Object Property" (window.prompt for label) + Delete
- ObjectPropertyEdge: "Change to Subclass" + Delete
- Click-outside backdrop closes menu; browser native right-click menu suppressed
- `ontologyStore.updateEdge(id, patch)` action for in-place edge type/label changes

## Files Created/Modified
- `src/components/canvas/EdgeContextMenu.tsx` — new component, fixed-position with backdrop
- `src/store/ontologyStore.ts` — added `updateEdge` to interface and implementation
- `src/components/canvas/OntologyCanvas.tsx` — edgeCtxMenu state, double-click/right-click handlers, EdgeContextMenu render

## Key Decision
`join` kind removed from menu — not a valid `MappingKind` in the current type definition.

## Verification
- Build: PASS
- Tests: 337/337
