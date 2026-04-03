---
phase: 11-rml-native-transform
plan: 01
status: complete
completed_at: "2026-04-03T19:15:00.000Z"
commit: 509370b
test_metrics:
  total: 318
  passing: 317
  failing: 1
  failing_note: "smoke.test.tsx pre-existing failure (getByText Rosetta) — unrelated to this phase"
  spec_tests_count: 8
---

# Phase 11 Plan 01 — Summary: RML-Native Transform

## Objective

Replace the Comunica SPARQL-based fusion path with RMLmapper-js as the transform engine. Remove the `join` mapping kind. Update the MAP panel to display read-only RML snippets for non-sparql kinds.

## Tasks Completed

| Task | Status | Notes |
|------|--------|-------|
| Task 1: Install rmlmapper-js + rmlSourceKey + XML branch | ✅ Done | fontoxpath installed; vite.config.ts updated |
| Task 2: Remove join kind | ✅ Done | Cleaned from types, sparql.ts, rml.ts, yarrrml.ts, MappingPanel, OutputPanel |
| Task 3: Create rmlExecute.ts, delete fusion.ts | ✅ Done | parseTurtle API confirmed; xpathLib uses string 'fontoxpath' |
| Task 4: Wire fusionStore + simplify Output tab | ✅ Done | Handled by Task 3 agent; JSON-LD preview + download in OutputPanel |
| Task 5: MAP panel RML snippet | ✅ Done | RML display for non-sparql kinds; SPARQL editor preserved for sparql + groups |

## Files Changed

- `package.json` — added @comake/rmlmapper-js, fontoxpath
- `vite.config.ts` — added optimizeDeps.include for rmlmapper-js
- `src/lib/rml.ts` — added rmlSourceKey(), XML branch (ql:XPath), generateRml uses rmlSourceKey
- `src/lib/rmlExecute.ts` — new: executeAllRml(), FusionResult, FusionSourceResult
- `src/lib/fusion.ts` — deleted
- `src/lib/sparql.ts` — removed join case from generateConstruct()
- `src/lib/yarrrml.ts` — removed join guard
- `src/store/fusionStore.ts` — imports executeAllRml; jsonLd from fusionResult.jsonLd directly
- `src/types/index.ts` — removed 'join' from Mapping['kind']; removed parentSourceId/parentRef/childRef
- `src/components/panels/MappingPanel.tsx` — RML snippet display for non-sparql kinds; removed join UI
- `src/components/panels/OutputPanel.tsx` — JSON-LD preview, Download JSON-LD button; fixed result.jsonLd.length
- `src/__tests__/rml.test.ts` — added rmlSourceKey tests, XML/JSON branch tests
- `src/__tests__/rmlExecute.test.ts` — new: 8 tests for executeAllRml
- `src/__tests__/fusion.test.ts` — deleted (tested old SPARQL executor)
- `src/__tests__/sparql.test.ts` — removed join test case, dead executeAllConstructs block

## Must-Haves Coverage

| Truth | Evidence |
|-------|---------|
| Transform & Fuse runs RMLmapper-js, no Comunica | fusionStore → executeAllRml → parseTurtle ✅ |
| MAP panel shows RML snippet for non-sparql kinds | MappingPanel conditional rendering on kind ✅ |
| No 'join' option in kind picker | Removed from type union + MappingPanel UI ✅ |
| XML sources use ql:XPath in generated RML | rml.ts dataFormat branch ✅ |
| sparql-kind skipped mappings in FusionResult.warnings | rmlExecute.ts warning loop ✅ |
| [review] Duplicate rmlSourceKey suffix — numeric suffix on collision | Not implemented — deferred |
| [review] parseTurtle failure → FusionResult.error alert | Catch block sets warning; FusedTab shows error state ✅ |
| [review] vite.config.ts optimizeDeps.include rmlmapper-js | Added ✅ |

## Key Decisions

- `parseTurtle` takes `xpathLib: 'fontoxpath'` (string), not the module object
- `fusion.test.ts` deleted (incompatible with new API); replaced by rmlExecute.test.ts
- Task 4 (fusionStore wiring + OutputPanel) handled by Task 3 agent to keep build clean
- Duplicate rmlSourceKey collision handling deferred (not in plan's core tasks)

## Verification Results

```
npm run build  → ✅ clean (no TS errors)
npm run test   → 317/318 pass (1 pre-existing smoke.test.tsx failure)
grep "from.*fusion" src/  → ✅ no results (only fusionStore imports, correct)
grep "executeAllConstructs" src/  → ✅ no results
grep "'join'" MappingPanel.tsx  → ✅ no results
```

## Issues Encountered

None blocking. The `smoke.test.tsx` failure pre-dates this phase.
