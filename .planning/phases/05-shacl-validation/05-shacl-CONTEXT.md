# Phase 05: SHACL Validation — Context

## Decisions

- **VAL tab is source-scoped**: The VAL tab in the right panel mirrors the SRC/MAP/OUT pattern — it shows violations for the active source only. No global cross-source view.
- **Validation store is ephemeral**: No IDB persistence. Results are held in memory only and lost on page reload. Stale results are marked, not cleared (see below).
- **Stale-flag policy**: When mappings change after a validation run, `validationStore.stale` is set to `true`. Results remain visible in the VAL tab with a "Mappings changed — re-validate to refresh" banner. Results are never auto-cleared mid-session. Only [Validate] clears the stale flag.
- **Violation resolution at validation time (Option A)**: `ViolationRecord` stores `canvasNodeId` resolved at validation time by tracing: `result.path → mapping.targetPropUri → mapping.sourceClassUri → schemaNode.id`. If resolution fails (no matching mapping, no matching node), `canvasNodeId` is `null` and clicking the violation is a no-op.
- **`jsonToInstances` recursive walk (Option A)**: Mirrors `jsonToSchema`'s `walkObject` exactly. Array items → one blank-node instance each. Primitive fields → typed literals (same XSD inference as `xsdRangeShort`). Nested object fields → child blank-node instance connected via ObjectProperty predicate. Recursion capped at depth 10.
- **No cardinality constraints in SHACL shapes**: The current ontology has no OWL Restrictions. `sh:minCount`/`sh:maxCount` are omitted from generated shapes — every source would fail otherwise.
- **No Comunica in Phase 5**: CONSTRUCT queries are executed via direct N3.Store pattern matching (the `generateConstruct` template always produces a predictable two-triple pattern). Comunica is deferred to Phase 6 (REQ-39).
- **`rdf-validate-shacl` + 4-line ShaclFactory adapter**: Install `rdf-validate-shacl` only. Use a minimal adapter `{ ...N3.DataFactory, dataset: (quads) => new N3.Store(quads) }` instead of `@zazuko/env` to avoid bundle bloat.
- **Violation clearing on mapping change**: `mappingStore` changes trigger `setStale(true)` on the validation store, not `reset()`. Full reset only happens when a new validate run completes.

## Discretion Areas

- **ValidationPanel list layout**: Card-per-violation vs. grouped-by-class list — executor decides based on what fits the existing shadcn component palette.
- **SourceStatusBadge exact icons/colours**: `✓` / `⚠` / `○` as described in research, but exact Phosphor icon choice and Tailwind colour tokens are at executor discretion within the existing design system.
- **Error banner styling when `rdf-validate-shacl` throws**: Use `<Alert variant="destructive">` from shadcn — exact copy is at executor discretion.

## Review Decisions (added 2026-03-27)

- **[review] validateWithShacl is async**: `rdf-validate-shacl`'s `validate()` returns a Promise. `validateWithShacl` returns `Promise<ViolationRecord[]>`, `validateSource` is `async`. `runValidation` already uses async/await so the store change is minimal.
- **[review] ViolationRecord.sourceId required**: Plan 05-03 ValidationPanel onClick calls `setActiveSourceId(violation.sourceId)`. Added `sourceId: string` to `ViolationRecord` interface; populated in `index.ts` from `source.id`.
- **[review] Empty schema guard in index.ts**: `validateSource` early-returns `[]` when `source.schemaNodes.length === 0` to prevent silent false-positive "All valid" when uriBase would be empty.
- **[review] Validate button disabled when loading**: `disabled={loading}` on the Button prevents double-click race condition in `runValidation`. Store also guards with `if (get().loading) return`.
- **[review] E2E test for violation-click highlight**: Added test 7 to `e2e/validation.spec.ts` to verify `ring-destructive` class applied to the matching SourceNode canvas element.
- **[review] runValidation must clear highlightedCanvasNodeId**: Plan 05-02 writes `runValidation`'s final `set()` call without `highlightedCanvasNodeId` (field doesn't exist in Plan 02). Plan 05-03's Task 2 instructs the executor to also update that `set()` call to include `highlightedCanvasNodeId: null` — otherwise re-validation leaves stale rings on now-valid nodes.
- **[review] SourceStatusBadge must NOT import getMappingsForSource**: Badge status is derived solely from `results[source.id]` and `lastRun`. The original plan text mentioned importing `getMappingsForSource` but the logic never used it — dead import removed from plan spec.
- **[review] VAL TabsTrigger aria-label required**: Must have `aria-label="Validation tab"` to match the `aria-label="X tab"` pattern on all existing tab triggers (SRC/ONTO/MAP/OUT).

## Review Decisions (added 2026-03-30, plan-review cycle 2)

- **[review] uiStore.ts 'VAL' already present**: `RightTab` union already includes `'VAL'`. Executor must skip the uiStore step in Task 1.
- **[review] validationStore highlightedCanvasNodeId already present**: The field, setter, and reset() clearing were pre-implemented. Task 2 only needs to confirm `runValidation`'s final `set()` call includes `highlightedCanvasNodeId: null`.
- **[review] Boolean Zustand selector in SourceNode**: `useValidationStore((s) => s.highlightedCanvasNodeId === id)` required (not the string selector). Prevents all N SourceNode instances re-rendering on each highlight change.
- **[review] Separate Zustand selectors in SourceStatusBadge**: `results` and `lastRun` must be two separate `useValidationStore` calls, not an inline object destructure, to avoid spurious re-renders.
- **[review] E2E test 7 locator**: React Flow places `data-id` on its wrapper `.react-flow__node`, not the SourceNode `<div>`. Assert ring on `[data-id="{nodeId}"] > div` first child.
- **[review] RightPanel onValueChange cast must include 'VAL'**: Line 88 cast `v as 'SRC' | 'ONTO' | 'MAP' | 'OUT'` must be updated to include `'VAL'` when the VAL trigger is added.

## Deferred Ideas

- **Manually-edited CONSTRUCT queries**: When a user edits the SPARQL in MappingPanel to a non-standard form, the pattern matcher in `executeConstruct` will fail silently (empty output, "no violations"). This is acceptable for Phase 5; Phase 6 replaces the executor with Comunica which handles arbitrary SPARQL.
- **sh:minCount / sh:maxCount**: Cardinality validation deferred until the ontology model supports OWL Restrictions.
- **Auto-validation on debounce**: Not worth the complexity/bundle cost in Phase 5; re-evaluate once Comunica is in place.
- **Cross-source violation summary**: A global "all sources" view would be useful but is out of scope for Phase 5.
- **fitView per-node zoom**: `rfInstance.current.fitView()` fits all visible nodes rather than centering on the highlighted node. To fix, the `rfInstance` ref type would need to expose `fitView({ nodes: [...] })`. Deferred to Phase 6 once the ref type is extended.
- **highlightedCanvasNodeId cleared on source switch**: When a user switches sources, the highlight ring persists on any previously highlighted node. Could be cleared with a `useEffect` watching `activeSourceId` in OntologyCanvas. Deferred — current behavior is not harmful.
- **Error state E2E test for rdf-validate-shacl throw**: Mocking a bundled library in Playwright is impractical. Covered by unit test in `src/__tests__/validationStore.test.ts` only.
- **⚠ badge E2E test**: E2E test 6 only verifies ✓ badge. A test for the ⚠ (violation-present) state requires a source+mapping combination that produces violations — deferred pending fixture data.
- **ValidationPanel unit tests**: 6 render states (no source, error, not-yet-run, stale, loading, valid/violations) have no Vitest unit coverage. E2E tests cover happy paths; edge state combinations (e.g., stale + no results) are untested. Deferred — acceptable for Phase 5 scope.
- **Stale highlightedCanvasNodeId after node deletion**: If a SourceNode is deleted while `highlightedCanvasNodeId` still points to its id, the id lingers in the store until re-validation or reset. No visible harm (no DOM element to show the ring). Clearing on node removal would require a sourcesStore side-effect; deferred to Phase 6.
- **Global violation count badge on VAL tab trigger**: An ambitious addition would show a count badge on the VAL `TabsTrigger` itself. Deferred — delight opportunity for future polish phase.
