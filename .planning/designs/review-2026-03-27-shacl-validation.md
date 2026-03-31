# Plan Review — Phase 05 SHACL Validation
**Date:** 2026-03-27 | **Mode:** HOLD SCOPE | **Plans reviewed:** 05-01, 05-02, 05-03

## What Already Exists (Leverage)
- `jsonToSchema.ts`: `xsdRangeShort`, `toPascalCase` helpers (duplicated in instanceGenerator by design — not exported)
- `sparql.ts`: `generateConstruct` always produces fixed two-triple CONSTRUCT pattern → `executeConstruct` pattern-matches it correctly
- `localName` from `rdf.ts` — correctly imported in ValidationPanel
- `freshPage` fixture in `e2e/fixtures.ts` — handles IDB clear for E2E tests

## Dream State Delta
```
CURRENT STATE          THIS PLAN (05)              12-MONTH IDEAL
Mappings exist but  →  Validate button in header →  Auto-validation on
are unverified.         shows per-source ✓/⚠/○,     debounce, cross-source
App has no feedback     clickable violations         summary, cardinality
on correctness.         highlight canvas nodes.      constraints (OWL restr.)
```

## Decisions Made During Review

| # | Issue | Decision |
|---|-------|----------|
| 1A | validate() async vs sync | Pipeline is async throughout — validateWithShacl returns Promise<ViolationRecord[]> |
| 2A | Empty schemaNodes → false-positive "All valid" | Early-return [] in validateSource when schemaNodes.length === 0 |
| 3A | Double-click Validate race condition | disabled={loading} on Button + store-level guard in runValidation |
| 4A | Three test gaps (canvasNodeId resolution, empty schema, E2E click) | Add all three |

## System Architecture Diagram

```
  PLAN 05-01 (library layer — pure functions)
  ┌────────────────────────────────────────────────────────┐
  │  src/lib/shacl/                                        │
  │    shapesGenerator.ts ──→ OntologyNode[] → N3.Store    │
  │    instanceGenerator.ts ─→ JSON string  → N3.Store     │
  │    constructExecutor.ts ─→ N3.Store + Mappings → Store │
  │    validator.ts ──────────→ 2x N3.Store → Promise<ViolationRecord[]> │
  │    index.ts ─────────────→ async validateSource()      │
  └──────────────────────────────────────────────────────┘
           ↓ await validateSource()
  PLAN 05-02 (store layer)
  ┌────────────────────────────────────────────────────────┐
  │  src/store/validationStore.ts                          │
  │    runValidation() ──→ await validateSource per source │
  │    setStale() ←─── subscribed to mappingStore changes  │
  └──────────────────────────────────────────────────────┘
           ↓ useValidationStore hooks
  PLAN 05-03 (UI layer)
  ┌────────────────────────────────────────────────────────┐
  │  ValidationPanel.tsx ────→ reads results[activeSourceId]│
  │  SourceSelector.tsx ─────→ reads results + lastRun     │
  │  SourceNode.tsx ─────────→ reads highlightedCanvasNodeId│
  │  OntologyCanvas.tsx ─────→ reacts to highlightedId     │
  └──────────────────────────────────────────────────────┘
```

## Test Coverage Diagram

```
┌──────────────────────────────────────────────────┐
│           TEST COVERAGE DIAGRAM                  │
├──────────────────────┬───────────┬───────────────┤
│ CODEPATH             │ TEST TYPE │ STATUS        │
├──────────────────────┼───────────┼───────────────┤
│ instanceGenerator    │ Unit      │ ✓ 5 tests     │
│ shapesGenerator      │ Unit      │ ✓ 2 tests     │
│ constructExecutor    │ Unit      │ ✓ 2 tests     │
│ validateWithShacl    │ Integ.    │ ✓ smoke test  │
│ validateSource       │ Integ.    │ ✓ smoke test  │
│ stale subscription   │ Unit      │ ✓ in plan     │
│ error path           │ Unit      │ ✓ in plan     │
│ canvasNodeId resolve │ Unit      │ ✓ ADDED       │
│ empty schema guard   │ Unit      │ ✓ ADDED       │
│ Validate button      │ E2E       │ ✓ in 05-03   │
│ VAL tab states       │ E2E       │ ✓ in 05-03   │
│ Source badges        │ E2E       │ ✓ in 05-03   │
│ Violation click+ring │ E2E       │ ✓ ADDED       │
└──────────────────────┴───────────┴───────────────┘
```

## Error & Rescue Registry

| METHOD | FAILURE | RESCUED? | USER SEES |
|--------|---------|----------|-----------|
| JSON.parse (instanceGen) | SyntaxError | Y — empty store | no violations (false-positive if mappings exist, but source has no schema → early-return guard prevents this) |
| executeConstruct | URI mismatch, no instances | Y (soft) — empty result | "All valid" (acceptable) |
| validateWithShacl | rdf-validate-shacl throws | Y — rethrow | Error banner in VAL tab |
| validateSource | empty schemaNodes | Y — early-return [] | no violations shown (correct) |
| runValidation | any source throws | Y — store.error set | destructive Alert in VAL tab |

## Failure Modes Registry

| CODEPATH | FAILURE | RESCUED? | TEST? | USER SEES | LOGGED? |
|----------|---------|----------|-------|-----------|---------|
| instanceGenerator | null schemaNodes[0] | Y (index.ts guard) | Y (added) | no violations | N |
| validateWithShacl | validate() rejects | Y (rethrow) | Y (smoke) | error banner | N |
| violation click | deleted source | soft — setActiveSourceId no-ops | N | no crash | N |
| constructExecutor | URI mismatch | soft — empty result | Y | "All valid" | N |

## Completion Summary

```
+====================================================================+
|            PLAN REVIEW — COMPLETION SUMMARY                        |
+====================================================================+
| Mode selected        | HOLD SCOPE                                  |
| System Audit         | Phase 07-01 done, 05 not started, fresh research |
| Step 0               | Scope accepted; 1 cross-plan wiring gap found|
| Section 1  (Arch)    | 1 critical gap (async pipeline)             |
| Section 2  (Errors)  | 5 error paths mapped, 1 WARNING (empty schema) |
| Section 3  (Security)| 0 issues — client-side only                 |
| Section 4  (Data/UX) | 1 gap fixed (double-click), 2 OK            |
| Section 5  (Tests)   | Diagram produced, 3 gaps added              |
| Section 6  (Future)  | Reversibility: 4/5, debt items: 1 (xsdRangeShort dup) |
+--------------------------------------------------------------------+
| Section 7  (Eng Arch)| 1 critical gap (sourceId missing)           |
| Section 8  (Code Ql) | 1 DRY violation (accepted), 0 over-eng      |
| Section 9  (Eng Test)| Test diagram produced, 3 gaps addressed     |
| Section 10 (Perf)    | 0 issues — explicit-run model, small data   |
+--------------------------------------------------------------------+
| PLAN.md updated      | 05-01: +4 truths; 05-02: +2 truths; 05-03: +1 truth |
| CONTEXT.md updated   | 5 decisions added, 5 items in deferred       |
| Error/rescue registry| 5 methods mapped, 0 CRITICAL GAPS            |
| Failure modes        | 4 total, 0 CRITICAL GAPS                    |
| Delight opportunities| N/A (HOLD SCOPE)                            |
| Diagrams produced    | 3 (system arch, test coverage, data flow)   |
| Unresolved decisions | 0                                           |
+====================================================================+
```
