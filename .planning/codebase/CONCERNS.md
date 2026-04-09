# Codebase Concerns

**Analysis Date:** 2026-04-09

## Tech Debt

**IDB persistence recovery race condition:**
- Issue: `useAutoSave` uses `hydratedRef` to prevent autosave during IDB restore, but hydration is async and completes in useEffect without coordination with store subscriptions. If store changes fire before `hydratedRef.current = true`, seed data could persist before user's saved project is restored.
- Files: `src/hooks/useAutoSave.ts` lines 67-77, 138-140
- Impact: Race window is 0-100ms in practice but not formally eliminated. Long-term: stale data in IDB.
- Fix approach: Add an explicit `hydrationComplete` action to each store; only enable subscriptions after all stores report hydration done. Or wrap restore logic in a Zustand batch operation.

**Mapping store undo stack never garbage-collected:**
- Issue: `_undoStack` in mappingStore persists all removed mapping batches indefinitely; no size limit or expiration.
- Files: `src/store/mappingStore.ts` lines 95-96, 348-390
- Impact: Long editing sessions could accumulate megabytes of undo history in memory and IDB.
- Fix approach: Cap `_undoStack` to last 20 removals, or add a `clearUndoStack()` action called after project save.

**Formula validation happens only at export:**
- Issue: `formulaExpression` is parsed and validated only when generating RML in `src/lib/rmlExecute.ts`. Syntax errors only surface after clicking "Export" — no real-time UI feedback.
- Files: `src/lib/rmlExecute.ts` lines 38-49, `src/lib/formulaParser.ts` lines 1-354
- Impact: Users cannot validate formulas until export; invalid formulas corrupt RML output.
- Fix approach: Add a `useEffect` hook that validates all formula mappings on change; surface errors in the editor panel. Pre-parse formulas on mount to catch stale data from IDB.

---

## Known Fragile Areas

**Bidirectional canvas↔editor sync with manual guard flags:**
- Why fragile: Two-way subscription with `isUpdatingFrom*` flags (lines 12-26 in useOntologySync) can deadlock if parser errors occur mid-sync or if canvasToTurtle takes >100ms. Missing a guard in a new sync path silently causes infinite loops.
- Files: `src/hooks/useOntologySync.ts` lines 16-26, 65-100
- Safe modification: Test all canvas mutations + concurrent editor changes. Never skip the `isUpdatingFromEditor` guard during canvas→editor path. If adding async work in canvasToTurtle, increase debounce beyond 100ms and audit all call sites.

**Property URI matching via schema node labels:**
- Why fragile: `resolveSourceReference` in `src/lib/rml.ts` relies on PropertyData's `label` field (source column name). If a source is re-ingested and JSON keys change, mappings built on old labels point to the wrong keys in RML output.
- Files: `src/lib/rml.ts` lines 131-147, `src/lib/jsonToSchema.ts` line 66
- Safe modification: Validate label round-trip in tests (jsonToSchema → rml → back to JSON). Never remove labels from PropertyData. Consider storing original source column name separately from label.

**OntologyCanvas god component (1100+ lines):**
- Why fragile: Owns all canvas UI state, store subscriptions, context menus, edge picker, group prompt, and node callbacks in one component. Changes to any feature risk unintended side effects.
- Files: `src/components/canvas/OntologyCanvas.tsx` lines 1-200+
- Safe modification: Extract context menus and edge picker into sibling components. Keep canvas-level state small; delegate to stores where possible.

---

## Performance Bottlenecks

**Large JSON/XML schema inference is synchronous:**
- Problem: `jsonToSchema` and `inferIterator` walk entire JSON object tree without yielding; large files (>10MB) freeze the UI thread.
- Files: `src/lib/jsonToSchema.ts` lines 51-100, `src/lib/rml.ts` lines 24-49
- Cause: No chunking, no Web Worker, no async iteration. Circular reference detection via WeakSet is O(n) per node.

**Comunica SPARQL queries block on large ontologies:**
- Problem: Validation shapes + ontology mutations trigger SPARQL CONSTRUCT queries that materialize full result set before returning.
- Files: `src/lib/shacl/validator.ts`, validation store subscriptions
- Cause: In-browser Comunica engine is not optimized for large graphs; no query optimizer or indexing beyond N3.

---

## Test Coverage Gaps

**RML formula mapping round-trip:**
- What's not tested: Formula expressions through full RML generation → execution pipeline. Currently only parser/evaluator tested in isolation (formulaParser.test.ts).
- Risk: A formula valid in formulaParser but invalid in FnO predicate structure could silently produce malformed RML or fail at runtime.
- Priority: High — formulas are a user-facing feature.

**IDB restore with corrupted or malformed data:**
- What's not tested: Restore of mappings with missing required fields (sourceId, id, kind). Type guards in useAutoSave lines 21-57 are permissive; they check only `id` field, not shape validation.
- Risk: Corrupted IDB data causes silent failures; `selectedMappingId` could point to nonexistent mapping. No user-visible error.
- Priority: High — persistent state data loss is unrecoverable.

**Circular reference handling in source ingestion:**
- What's not tested: jsonToSchema with actual circular object graphs (parent → child → parent). Current code detects and silently suppresses edges.
- Risk: User loses properties without UI feedback that they were dropped due to circular refs.
- Priority: Medium — users may not notice missing properties in generated schema.

**Bidirectional sync guard under rapid edits:**
- What's not tested: Turtle editor + canvas mutations firing simultaneously; guard flags under stress.
- Risk: Circular update loops in new sync paths.
- Priority: Medium

---

## Security & Stability Notes

**Formula parser is safe (no eval):**
- File: `src/lib/formulaParser.ts` — hand-rolled tokenizer + recursive descent, produces AST only. No security issues.

**RML execution delegates to @comake/rmlmapper-js:**
- Issue: No TypeScript declarations; library may throw uncaught errors. Error handling in executeAllRml is basic (lines 71-74).
- Files: `src/lib/rmlExecute.ts` lines 64-66, 71-74

---

*Concerns audit: 2026-04-09*
