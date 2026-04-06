---
phase: 15-formula-mapping
---

# Phase 15 Context: Formula Mapping Editor

## Decisions

- **formula kind added, sparql kind removed**: `Mapping.kind` union becomes `direct | template | constant | typecast | language | formula`. `sparqlConstruct` field removed. No backwards-compat shim — hydrate migrates sparql→formula with empty expression.
- **Hand-rolled recursive descent parser** in `src/lib/formulaParser.ts` — no external parser library. Grammar is small and closed; adding Peggy/Chevrotain would be overengineering.
- **No eval(), no Function()**: parser produces an AST that is serialized to RML triples. The formula string never runs as JavaScript at any point.
- **Legacy fnml: syntax** for FnO triples (`fnml:functionValue` + `fno:executes` + grel: parameter predicates). New W3C RML-FNML syntax deferred — not yet widely supported by rmlmapper-js.
- **Function whitelist (plan 1 scope)**: CONCAT, UPPER, LOWER, TRIM, REPLACE. Conditionals (IF/idlab-fn:) deferred to plan 2 or later.
- **CAST is not a formula function** — type coercion is already `typecast` kind using `rr:datatype`; no overlap in formula.
- **grel: namespace**: `http://users.ugent.be/~bjdmeest/function/grel.ttl#`
- **CONCAT chaining**: grel:string_concat is strictly 2-input; CONCAT(a,b,c) emits nested blank node chain.
- **Tier 3 (raw RML) is the existing RML snippet pane** — no new component; formula kind must generate correct FnO Turtle that appears there automatically.
- **SparqlEditor component removed** — it was only used for sparql kind; delete it entirely.
- **3-tier toggle** renders inside the kind-specific field area of MappingPanel, only visible when `kind === 'formula'`. Default tier is Form (Tier 1).
- **Bidirectional Form↔Formula sync**: editing form fields updates the formula bar string; parsing a formula back into structured args updates the form. If formula is un-parseable as a simple single call, form shows read-only preview.
- **formulaExpression stored as string** on the Mapping object — the source of truth. AST is derived on render/export.

- **[review] MappingGroup also migrates away from sparqlConstruct**: `MappingGroup.sparqlConstruct` is removed from all variants; `formulaExpression?: string` added. `src/lib/sparql.ts` is deleted entirely. IDB hydrate migrates legacy group data by discarding the auto-generated SPARQL string and setting `formulaExpression: ''`.
- **[review] generateRml() rescues parseFormula errors**: try/catch wraps the formula branch; invalid expressions emit `# formula-error: {message}` in Turtle output rather than throwing and crashing the RML panel.
- **[review] Turtle literal escaping**: `turtleEscape()` helper in `rml.ts` escapes backslash and double-quote in string literals before embedding in Turtle output.
- **[review] formulaTier resets via key prop**: the tier container uses `key={selectedMapping?.id}` to unmount/remount on mapping selection change, resetting tier state to Form without a useEffect.
- **[review] emitFnOPOM() signature**: `emitFnOPOM(ast: Expr, mapping: Mapping, sourceName: string, counter: { n: number }): string` — counter object is shared across formula mappings in one generateRml() call for unique blank node IDs.
- **[review] MappingGroup shows 2-tier UI (Formula/RML only)**: groups don't get a Form builder in plan 02 (too complex for groups); just FormulaBar + RML pane.

## Discretion Areas

- **Exact CodeMirror language extension scope for Tier 2**: syntax highlighting + autocomplete for known function names and `source.` field references is the target; error squiggles are a bonus if straightforward.
- **Form builder arg count UI**: for CONCAT which is variadic, use an "Add argument" button with a list of inputs. Upper limit of 8 args is reasonable.
- **FnO blank node naming**: use numbered blank nodes (`_:fn0`, `_:fn0_p0`) scoped per-mapping to avoid collisions in the Turtle output.

## Deferred Ideas

- **Conditional (IF) function** using idlab-fn:trueCondition — requires nested FunctionMaps; plan 2 extension.
- **Math functions** (grel:math_ceil, grel:math_floor, etc.) — not needed for NATO demo scenario.
- **New W3C RML-FNML syntax** (`rml:functionExecution` / `rml:input`) — defer until rmlmapper-js adopts it.
- **Formula validation in the RML execution pipeline** — currently Transform & Fuse runs via rmlmapper-js; FnO execution support depends on which functions rmlmapper-js ships. Execution correctness is out of scope for plan 1.
