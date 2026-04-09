---
plan: 13-08
title: Node Search — Always Visible, Property Search, Richer Highlights
status: complete
completed: 2026-04-09
test_metrics:
  tests_passed: 337
  spec_tests_count: 0
---

# Summary: Plan 13-08

## What Was Built
- Search panel is now always visible at top-right of canvas (no toggle)
- Ctrl+F focuses the search input; Escape clears query
- Property-level search: matches `prop.label` and `prop.uri` across all nodes
- `matchedPropUrisMap` tracks which property URIs matched per node
- Matching property rows highlighted with `bg-primary/10`
- Node ring upgraded from `ring-blue-400` to `ring-2 ring-primary ring-offset-2`
- `useKeyboardShortcuts` now accepts `searchInputRef` ref instead of `onOpenSearch` callback

## Files Modified
- `src/components/canvas/OntologyCanvas.tsx` — always-visible panel, property match logic, matchedPropUris in node data
- `src/components/nodes/ClassNode.tsx` — bolder ring, property row highlight
- `src/components/nodes/SourceNode.tsx` — bolder ring, property row highlight
- `src/hooks/useKeyboardShortcuts.ts` — ref-based focus instead of toggle
- `src/App.tsx` — searchInputRef created and passed down

## Verification
- Build: PASS
- Tests: 337/337
