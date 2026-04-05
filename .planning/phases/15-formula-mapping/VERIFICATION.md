---
phase: 15-formula-mapping
verified: "2026-04-05T18:15:00Z"
---

# Phase 15 Verification

## Test Results
- **Tests:** 336/336 passing (29 test files)
- **Build:** clean (tsc -b + vite build)
- **Lint:** n/a (no lint step in CI)

## Must-Haves Coverage

### Plan 15-01
- [x] Mapping.kind no longer includes 'sparql'; sparqlConstruct field gone from type
- [x] Mapping.kind includes 'formula' with formulaExpression string field
- [x] MappingGroup no longer has sparqlConstruct; all group formulas use formulaExpression?: string
- [x] parseFormula('CONCAT(source.a, source.b)') returns valid CallExpr AST
- [x] parseFormula with unknown function name throws validation error
- [x] generateRml() emits fnml:functionValue blocks for formula mappings with grel: function URIs
- [x] generateYarrrml() emits function:/parameters: blocks for formula mappings
- [x] npm run build passes
- [x] generateRml() wraps parseFormula() in try/catch; invalid formulaExpression emits # formula-error: comment
- [x] String literals Turtle-escaped (turtleEscape helper)
- [x] src/lib/sparql.ts deleted

### Plan 15-02
- [x] Selecting formula kind shows 3-tier toggle (Form / Formula / RML)
- [x] Tier 1 Form: CONCAT shows N arg fields with Add/Remove; UPPER shows 1 field
- [x] Editing Form fields updates formulaExpression in store
- [x] Tier 2 Formula bar: valid expression shows green badge; invalid shows red
- [x] Typing in Formula bar updates formulaExpression in store
- [x] Switching Form→Formula shows expression built by Form
- [x] Switching Formula→Form updates form fields if parseable single call
- [x] Tier 3 RML shows FnO triples
- [x] sparql kind option absent from kind picker
- [x] SparqlEditor removed
- [x] npm run build passes
- [x] Switching mapping resets formulaTier to 'form' (key={selectedMapping?.id})
- [x] MappingGroup with formulaExpression shows 2-tier (Formula/RML)

## Requirements Coverage
- REQ-116 ✓ (plan 15-01)
- REQ-117 ✓ (plan 15-01)
- REQ-118 ✓ (plan 15-01)
- REQ-119 ✓ (plan 15-02)
- REQ-120 ✓ (plan 15-02)
- REQ-121 ✓ (plan 15-02)
- REQ-122 ✓ (plan 15-02)

## Gate Results
- **Gate 0 (Integration):** fallow health JSON parse failed — skipped with warning
- **Gate 1 (Goal Verification):** All must-haves confirmed via grep + build
- **Gate 1.5 (Security):** No eval()/Function() — formula DSL produces AST only, serialized to Turtle. Pass.
- **Gate 2 (Design):** Visual ratio ~17%; component tests cover all tier interactions. Advisory pass.
- **Gate 3 (Final):** 336/336 tests, build clean.
