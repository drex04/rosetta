# Plan Review — Phase 15: Formula Mapping Editor
**Date:** 2026-04-05  
**Plans reviewed:** 15-01-PLAN.md (backend), 15-02-PLAN.md (UI)  
**Mode:** HOLD SCOPE

---

## Completion Summary

```
+====================================================================+
|            PLAN REVIEW — COMPLETION SUMMARY                        |
+====================================================================+
| Mode selected        | HOLD SCOPE                                  |
| System Audit         | MappingGroup.sparqlConstruct gap found;     |
|                      | sparql.ts import in mappingStore identified |
| Step 0               | HOLD SCOPE confirmed; scope right for both  |
|                      | plans; expansion snapshot saved to deferred |
| Section 1  (Arch)    | 1 issue — emitFnOPOM() call site           |
| Section 2  (Errors)  | 4 error paths mapped, 2 CRITICAL GAPS      |
| Section 3  (Security)| 1 issue — Turtle literal escaping          |
| Section 4  (Data/UX) | 1 CRITICAL (MappingGroup scope), 1 edge     |
|                      | case (formulaTier reset)                    |
| Section 5  (Tests)   | Diagram produced, 6 gaps addressed         |
| Section 6  (Future)  | Reversibility: 4/5, 0 debt items           |
+--------------------------------------------------------------------+
| Section 7  (Eng Arch)| 0 additional issues                        |
| Section 8  (Code Ql) | 1 — sparql.ts must be deleted              |
| Section 9  (Eng Test)| Test diagram produced, 6 gaps → addressed  |
| Section 10 (Perf)    | 0 issues                                   |
+--------------------------------------------------------------------+
| PLAN.md updated      | 3 truths added to 01, 2 truths added to 02  |
| CONTEXT.md updated   | 6 decisions locked                          |
| Error/rescue registry| 4 methods, 2 CRITICAL GAPS → fixed in plan  |
| Failure modes        | 4 total, 2 CRITICAL GAPS → PLAN.md truths  |
| Delight opportunities| N/A (HOLD mode)                            |
| Diagrams produced    | 3 (data flow, error flow, test coverage)   |
| Unresolved decisions | 0                                          |
+====================================================================+
```

---

## Decisions Made During Review

1. **emitFnOPOM() call site specified** — `emitFnOPOM(ast, mapping, sourceName, counter)` called from within `generateRml()` formula branch; counter is shared object for unique blank node IDs across all mappings in one document.

2. **generateRml() rescues parseFormula errors** — try/catch wraps formula branch; invalid `formulaExpression` emits `# formula-error: {message}` instead of throwing and crashing the RML output panel.

3. **Turtle literal escaping** — `turtleEscape()` helper escapes `\` → `\\` and `"` → `\"` before embedding literal values in Turtle output.

4. **MappingGroup also migrates away from sparqlConstruct** — user confirmed: `MappingGroup.sparqlConstruct` removed, `formulaExpression?: string` added. `src/lib/sparql.ts` deleted. Task 4 added to Plan 01.

5. **formulaTier reset via key prop** — `key={selectedMapping?.id}` on tier container; unmounts on selection change, resetting tier to Form without a useEffect.

6. **MappingGroup 2-tier UI in Plan 02** — groups get Formula/RML tiers only (no Form builder); FormulaBar is reused.

---

## Critical Gaps Fixed

### GAP 1: MappingGroup.sparqlConstruct not in scope (CRITICAL)
- **Problem:** Plan 01 Task 1 said "remove any action/selector referencing sparqlConstruct" — dangerously broad. `MappingGroup` had its own `sparqlConstruct` (types/index.ts lines 66/74/83) and `generateGroupConstruct()` (mappingStore.ts line 3) which are entirely unrelated to the Mapping kind feature.
- **Resolution:** User confirmed MappingGroup should also move to formula. Added Task 4 to Plan 01. Task 1 scoped to Mapping only.

### GAP 2: generateRml() throws on invalid formulaExpression (CRITICAL)
- **Problem:** `generateRml()` called `parseFormula()` (throws version) with no rescue. A stored invalid expression would crash the RML output panel entirely.
- **Resolution:** Added try/catch with `# formula-error:` comment fallback to Task 3 and Plan 01 truths.

---

## Error & Rescue Registry

| METHOD/CODEPATH | ERROR | RESCUED? | USER SEES |
|---|---|---|---|
| parseFormula() | Unknown function | Y (parseAndValidate) | Red badge in FormulaBar |
| parseFormula() | Arity error | Y (parseAndValidate) | Red badge |
| parseFormula() | Empty string | Y (parseAndValidate) | No badge / error |
| generateRml() formula branch | Invalid formulaExpression | Y → fixed in review | `# formula-error:` comment |
| emitFnOPOM() string literal | Unescaped quote/backslash | Y → fixed in review | Escaped correctly in output |

---

## Test Coverage Diagram

```
┌──────────────────────────────────────────────────────┐
│              TEST COVERAGE DIAGRAM                   │
├──────────────────────────┬──────────┬────────────────┤
│ CODEPATH                 │ TYPE     │ STATUS         │
├──────────────────────────┼──────────┼────────────────┤
│ parseFormula() happy     │ Unit     │ ✓ Specified    │
│ parseFormula() empty str │ Unit     │ → Added        │
│ parseFormula() errors    │ Unit     │ ✓ Specified    │
│ emitFnOPOM() UPPER/LOWER │ Unit     │ ✓ Specified    │
│ emitFnOPOM() REPLACE     │ Unit     │ → Added        │
│ emitFnOPOM() CONCAT 3+   │ Unit     │ → Added        │
│ generateRml() err rescue │ Unit     │ → Added        │
│ Turtle literal escaping  │ Unit     │ → Added        │
│ MappingGroup hydrate     │ Unit     │ → Added (T4)   │
│ FormBuilder render       │ Component│ ✓ Specified    │
│ FormulaBar valid badge   │ Component│ ✓ Specified    │
│ FormulaBar invalid badge │ Component│ ✓ Specified    │
│ Formula→Form parseable   │ Component│ → Added        │
│ Formula→Form complex     │ Component│ → Added        │
│ RML tier shows Turtle    │ Component│ → Added        │
│ Tier reset on selection  │ Component│ → Added        │
└──────────────────────────┴──────────┴────────────────┘
```

---

## Data Flow Diagrams

### Plan 01 — formula kind data flow
```
formulaExpression (string, stored in Mapping/MappingGroup)
  │
  ├─→ [UI: FormulaBar]  parseAndValidate() → errors[] → badge
  │
  └─→ [generateRml()]
        │
        ├─ try: parseFormula() → Expr AST
        │         │
        │         └─→ emitFnOPOM(ast, mapping, sourceName, counter)
        │               │
        │               ├─ field ref → rml:reference "fieldName"
        │               ├─ literal  → rr:constant "{turtleEscape(value)}"
        │               └─ call     → fnml:functionValue block
        │                              └─ CONCAT 3+ args → nested chain
        │
        └─ catch: emit "# formula-error: {message}"
```

### Error rescue flow
```
invalid formulaExpression in store
  │
  ├─→ FormulaBar: parseAndValidate() → red badge  ← USER SEES
  │
  └─→ generateRml(): try/catch → "# formula-error:" comment
        ↓
     RML pane shows partial output with error annotation  ← USER SEES
     (does NOT throw / crash the panel)
```

---

## Deferred Ideas (saved for future planning)

- **Expansion opportunity:** CodeMirror language extension for FormulaBar (syntax highlighting, autocomplete for function names and `source.` field refs, error squiggles). Deferred from plan 02 scope.
- **Expansion opportunity:** `idlab-fn:trueCondition` conditional mapping (IF/ELSE) using nested FunctionMaps. Deferred to plan 2 extension per CONTEXT.md.
- **Expansion opportunity:** YARRRML list syntax for CONCAT (`[a, b, c]`) auto-expanding to chained calls. Currently only 2-arg YARRRML syntax emitted.

---

## What Already Exists (leverage points)
- RML snippet pane in MappingPanel — reused as Tier 3 with no new component
- Kind picker select — formula option added, sparql removed
- Mapping type shape — `formulaExpression` field mirrors existing `sparqlConstruct` slot
- N3.js / Turtle output infrastructure — `rml.ts` already emits valid Turtle; formula adds new blocks
