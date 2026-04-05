---
phase: 15-formula-mapping
plan: 01
subsystem: rdf-mapping
tags: [formula, rml, fno, parser]
requires: []
provides:
  - "Mapping.kind === 'formula' with formulaExpression field in types"
  - "Hand-rolled DSL parser (parseFormula/validateFormula/parseAndValidate) in formulaParser.ts"
  - "FnO/grel Turtle emitter (emitFnOPOM) in rml.ts using legacy fnml: syntax"
  - "YARRRML function:/parameters: emitter for formula mappings"
  - "IDB hydrate migration: sparql→formula for both Mapping and MappingGroup"
  - "src/lib/sparql.ts deleted; SparqlEditor removed from MappingPanel"
affects: [15-02]
tech-stack:
  added: []
  patterns:
    - "Recursive descent parser with whitelist validator"
    - "FnO blank node chain for CONCAT 3+ args"
    - "try/catch rescue in generateRml() emitting # formula-error: comment"
key-files:
  created:
    - src/lib/formulaParser.ts
    - src/__tests__/formulaParser.test.ts
  modified:
    - src/types/index.ts
    - src/store/mappingStore.ts
    - src/lib/rml.ts
    - src/lib/yarrrml.ts
    - src/components/panels/MappingPanel.tsx
    - src/components/panels/OutputPanel.tsx
    - src/components/canvas/OntologyCanvas.tsx
    - src/components/layout/Header.tsx
key-decisions:
  - "Legacy fnml: syntax (fnml:functionValue + fno:executes + grel:) — new W3C RML-FNML deferred"
  - "CONCAT 3+ args: left-associative nested blank node chain (grel:string_concat is 2-input)"
  - "emitFnOPOM signature takes counter object for unique blank node IDs across a document"
  - "hydrate migrates legacy groups by discarding sparqlConstruct, setting formulaExpression: ''"
requirements-completed:
  - REQ-116
  - REQ-117
  - REQ-118
test_metrics:
  tests_passed: 328
  tests_failed: 0
  tests_total: 328
  coverage_line: null
  coverage_branch: null
  test_files_created:
    - src/__tests__/formulaParser.test.ts
  spec_tests_count: 0
duration: ~18min
completed: "2026-04-05T18:00:00Z"
---

## What Was Done

- Removed `'sparql'` from `Mapping.kind` union; added `'formula'` with `formulaExpression?: string`
- Removed `MappingGroup.sparqlConstruct`; added `formulaExpression?: string` to all 3 group variants
- Deleted `src/lib/sparql.ts` and `src/__tests__/sparql.test.ts` entirely
- Created `src/lib/formulaParser.ts`: tokenizer → recursive descent parser → AST types → whitelist validator for CONCAT/UPPER/LOWER/TRIM/REPLACE
- Implemented `emitFnOPOM()` in `rml.ts` with full FnO Turtle emission, turtleEscape(), CONCAT chaining, and formula-error rescue
- Implemented YARRRML `function:`/`parameters:` emission in `yarrrml.ts`
- IDB `hydrate()` migrates `kind: 'sparql'` Mappings and `sparqlConstruct` MappingGroups to `formulaExpression: ''`
- MappingPanel kind picker now shows `formula` option; SparqlEditor replaced with plain div

## Decisions Made

| Decision | Rationale | Alternatives |
|----------|-----------|--------------|
| Legacy fnml: syntax | rmlmapper-js doesn't yet support new W3C RML-FNML | New rml:functionExecution syntax (deferred) |
| Left-associative CONCAT chain | grel:string_concat is strictly 2-input | Single multi-input call (not spec-compliant) |
| counter object for blank nodes | Unique IDs across multiple formula mappings in one document | UUID per blank node (overkill) |

## Deviations from Plan

- [Rule 1] Cascade fixes: ~10 component/test files still referenced `kind: 'sparql'` or `sparqlConstruct` on Mapping — fixed as blocking TypeScript errors
- [Rule 1] Fixed `noUncheckedIndexedAccess` errors in formulaParser.ts with `!` assertions

## Issues Encountered

None — build and tests clean after cascade fixes.

## Next Phase Readiness

Plan 15-02 can proceed: `parseFormula`, `parseAndValidate`, `Mapping.kind === 'formula'`, and `formulaExpression` field are all in place. MappingPanel kind picker already shows `formula` option.

## Test Results

- **Tests:** 328/328 passing
- **Coverage:** not configured
- **Test files created:** src/__tests__/formulaParser.test.ts (27 tests)
- **Spec-generated tests:** no
