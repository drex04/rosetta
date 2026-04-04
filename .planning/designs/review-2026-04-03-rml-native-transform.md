# Plan Review: Phase 11 — RML-Native Transform
**Date:** 2026-04-03  
**Mode:** HOLD SCOPE  
**Reviewer:** plan-review skill

---

## System Architecture (before → after)

```
BEFORE (fusion.ts / Comunica):
Sources ──▶ sourceToInstances() ──▶ N3.Store (instances)
                                       ↓
                              generateConstruct() → SPARQL CONSTRUCT
                                       ↓
                            Comunica engine.queryQuads()
                                       ↓
                              N3.Store (fused) ──▶ compactToJsonLd ──▶ display

AFTER (rmlExecute.ts / RMLmapper-js):
Sources ──▶ generateRml() + rmlSourceKey() ──▶ RML Turtle + inputFiles map
                                                       ↓
                              parseTurtle(rml, files, { xpathLib: fontoxpath })
                                                       ↓
                              JSON-LD array ──▶ fusionStore.jsonLd ──▶ FusedTab
```

## Data Flow (with shadow paths)

```
INPUT ──▶ generateRml() ──▶ parseTurtle() ──▶ jsonLd[] ──▶ FusedTab
  │             │                │                │
  ▼             ▼                ▼                ▼
nil sources   no mappings    throws →           empty array
[early ret]   [empty str,    FusionResult       [empty state]
               early ret]    .error field
```

## Error & Rescue Registry

| Method/Codepath | What can go wrong | Rescued? | User sees |
|----------------|-------------------|----------|-----------|
| parseTurtle() | Invalid RML Turtle | Y | FusedTab error alert |
| parseTurtle() | fontoxpath XML error | Y | FusedTab error alert |
| parseTurtle() | inputFiles key mismatch | Mitigated (shared rmlSourceKey import) | N/A |
| rmlSourceKey() | Duplicate sanitized name | Y | console.warn + suffix |
| executeAllRml() | sparql-kind mapping | Y | FusionResult.warnings count |
| generateRml() | Source with no mappings | Y | Empty string, early return |

## Failure Modes Registry

| Codepath | Failure | Rescued? | Test? | User sees? | Logged? |
|----------|---------|----------|-------|------------|---------|
| parseTurtle throws | Error | Y | Y (added) | Alert (added) | Y |
| Duplicate rmlSourceKey | Silent overwrite | Y (added) | Y (added) | console.warn | Y |
| sparql-kind mapping | 0 triples | Y | Y | warnings count | N/A |
| XML source bad iterator | Wrong results | N (deferred) | N | 0 triples | N |

## Test Coverage Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                  TEST COVERAGE DIAGRAM                       │
├──────────────────────────────┬───────────┬─────────────────┤
│ CODEPATH                     │ TEST TYPE │ STATUS          │
├──────────────────────────────┼───────────┼─────────────────┤
│ rmlSourceKey() JSON/XML      │ Unit      │ ✓ Planned       │
│ rmlSourceKey() dup suffix    │ Unit      │ ✓ Added (review)│
│ generateRml() XML branch     │ Unit      │ ✓ Planned       │
│ join kind removal (types)    │ Build     │ ✓ Planned       │
│ executeAllRml() happy path   │ Integ.    │ ✓ Planned       │
│ executeAllRml() sparql warn  │ Integ.    │ ✓ Planned       │
│ executeAllRml() XML key match│ Integ.    │ ✓ Planned       │
│ executeAllRml() throws→error │ Integ.    │ ✓ Added (review)│
│ executeAllRml() dup key      │ Integ.    │ ✓ Added (review)│
│ FusedTab error alert         │ Manual    │ ~ (visual)      │
│ MappingPanel RML snippet     │ Manual    │ ~ (visual)      │
└──────────────────────────────┴───────────┴─────────────────┘
```

## What already exists

- `rml.ts` — iterator inference, subject template heuristic, `generateRml()` body
- `fusion.ts` — `FusionResult`/`FusionSourceResult` types (move to rmlExecute.ts)
- `N3.Parser` — not needed in rmlExecute.ts but retained in project for SHACL

## Dream state delta

```
CURRENT (pre-phase 11)      THIS PLAN               12-MONTH IDEAL
Comunica SPARQL on          RMLmapper-js on          RML authoring UI,
N3.Store instances          raw JSON/XML             live preview,
(slow, indirect)            JSON-LD output           SHACL on fused output
```

## Deferred items

- Web Worker for parseTurtle (non-blocking main thread)
- Turtle/N-Quads export (requires `{ toRDF: true }` switch)
- SHACL validation on fused output (Phase 12 concern)

---

## Completion Summary

```
+====================================================================+
|            PLAN REVIEW — COMPLETION SUMMARY                        |
+====================================================================+
| Mode selected        | HOLD SCOPE                                  |
| System Audit         | Decision concern surfaced + resolved         |
| Step 0               | HOLD confirmed; JSON-LD output kept          |
| Section 1  (Arch)    | 1 issue found (duplicate rmlSourceKey)       |
| Section 2  (Errors)  | 4 error paths mapped, 1 GAP (error field)   |
| Section 3  (Security)| 0 issues — client-only, no external surface |
| Section 4  (Data/UX) | 1 gap (vite.config.ts preemptive fix)        |
| Section 5  (Tests)   | Diagram produced, 2 gaps (dup + throw tests) |
| Section 6  (Future)  | Reversibility: 3/5, debt: Phase 12 SHACL   |
+--------------------------------------------------------------------+
| Section 7  (Eng Arch)| Clean seam, 0 issues                        |
| Section 8  (Code Ql) | 1 note: import path updates across 3 files  |
| Section 9  (Eng Test)| Diagram produced, 2 gaps added to plan       |
| Section 10 (Perf)    | Main-thread blocking noted, deferred         |
+--------------------------------------------------------------------+
| PLAN.md updated      | 3 truths added, vite.config.ts to files     |
| CONTEXT.md updated   | 6 decisions locked, 3 deferred items added  |
| Error/rescue registry| 6 methods, 1 CRITICAL GAP → fixed           |
| Failure modes        | 4 total, 0 remaining CRITICAL GAPS          |
| Diagrams produced    | Architecture, data flow, test coverage       |
| Unresolved decisions | 0                                           |
+====================================================================+
```
