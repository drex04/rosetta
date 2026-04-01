---
phase: 09-bug-fixes-ui-ux-overhaul
plan: 01
status: complete
completed_at: "2026-04-01T13:30:00.000Z"
test_metrics:
  passed: 256
  failed: 0
  spec_tests_count: 0
---

# Plan 09-01 Summary: Bug Fixes

## Objective

Fixed 6 critical bugs: source node position jumps on .ttl edit, context menu/dialog overlap, CodeMirror selection invisibility, ontology canvas→editor sync gap, mapping invalidation on property rename, and Transform & Fuse producing 0 triples for direct mappings.

## Tasks Completed

| Task | Status | Commit |
|------|--------|--------|
| 1: CodeMirror selection + context menu/dialog overlap | ✅ | a62e2d8 |
| 2: Ontology canvas→editor sync | ✅ | 69ccf9b, 5cd1d93 |
| 3: Source .ttl node position preservation | ✅ | 6686ab9 |
| 4: Mapping invalidation on property rename | ✅ | 613d0f5 |
| 5: Transform & Fuse direct mapping fix | ✅ | d7dc958, 4f4a0d5 |

## Key Files Created/Modified

- `src/lib/codemirror-theme.ts` — added `.cm-selectionBackground` (#b4d5fe), focused variant (#90c0fc), `.cm-cursor`
- `src/components/canvas/OntologyCanvas.tsx` — `addPropFor` now includes `nodeType`; dialog decoupled from menu state
- `src/hooks/useOntologySync.ts` — canvas→editor subscription with 100ms debounce, try/catch error surfacing
- `src/lib/rdf.ts` — `convertToSourceNodes` adds `posByIndex` as fallback in position chain
- `src/hooks/useInvalidateMappings.ts` — NEW: subscribes to ontologyStore, diffs property URIs, calls `removeInvalidMappings`
- `src/lib/sparql.ts` — fixed direct mapping CONSTRUCT: `?target` → `?source` as subject
- `src/lib/fusion.ts` — `sourcePrefix` passthrough + empty `schemaNodes` guard
- `src/__tests__/codemirror-selection.test.ts` — NEW
- `src/__tests__/rdf-position.test.ts` — NEW (6 tests)
- `src/__tests__/mapping-invalidation.test.ts` — NEW (5 tests)
- `src/__tests__/sparql.test.ts` — extended (22 tests)
- `src/__tests__/fusion.test.ts` — fixed schemaNodes fixture

## Verification

- `npm run build` — zero TypeScript errors ✅
- `npx vitest run` — 256 passed, 0 failed ✅

## Must-Haves Coverage

- ✅ Editing a source node name in .ttl preserves canvas position (posByIndex fallback)
- ✅ Add Property dialog opens without context menu overlap (state decoupled)
- ✅ CodeMirror selection visible (`.cm-selectionBackground` added)
- ✅ Ontology canvas→editor sync (store subscription + debounce)
- ✅ Property rename removes stale mappings (useInvalidateMappings hook)
- ✅ Transform & Fuse produces non-zero triples (CONSTRUCT ?target→?source fix)

## Issues Encountered

- fusion.test.ts had `schemaNodes: []` fixtures that triggered the new guard — fixed test data
- Task 2 prop types needed correction (MutableRefObject → RefObject)
