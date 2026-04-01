# Code Review Report -- Full Codebase Review

**Date:** 2026-04-01
**Reviewer:** Claude Opus 4.6
**Scope:** All stores, lib files, hooks, key components, types, and test files

---

## Summary

- **Files reviewed:** 45 (all stores, all lib files, all hooks, all panels, canvas, types, App, 12 test files)
- **Severity breakdown:** 3 critical, 7 important, 8 minor, 5 nitpick
- **Overall quality: 7.5/10**

The codebase is well-structured for a client-side learning tool. Store design is clean, type safety is generally good, and the RDF pipeline (parse/serialize/SHACL/SPARQL) is solid. The main concerns are: a race condition in the undo buffer, silently swallowed errors in the fusion pipeline, and the confirmed circular dependency between stores. The complexity hotspots flagged by static analysis are real but manageable.

---

## Critical Issues

### 1. Race condition in `_undoBuffer` -- single-slot undo loses data silently
- **File:** `src/store/mappingStore.ts:289-314`
- **Confidence:** 90
- **Issue:** `removeInvalidMappings` overwrites `_undoBuffer` with the current batch of invalid mappings. If it is called twice before `undoLastRemoval` runs, the first batch is permanently lost with no warning.
- **Why it matters:** The undo toast tells the user they can undo, but the data is already gone if a second invalidation fires (e.g., rapid ontology edits that each remove a node). This is a data-loss scenario triggered by normal user interaction.
- **Fix:** Use a stack (`_undoBuffer: Mapping[][]`) and pop from it in `undoLastRemoval`, or merge into the existing buffer instead of replacing it:
  ```ts
  _undoBuffer: [...s._undoBuffer, ...invalid]
  ```

### 2. Circular dependency: `mappingStore` <-> `validationStore`
- **File:** `src/store/mappingStore.ts:3` imports `validationStore`; `src/store/validationStore.ts:5` imports `mappingStore`
- **Confidence:** 95
- **Issue:** Confirmed by static analysis. `mappingStore` calls `useValidationStore.getState().setStale(true)` directly inside its actions. `validationStore` imports `useMappingStore` to read mappings during validation. This creates a mutual import cycle.
- **Why it matters:** While Zustand's lazy creation means this works at runtime today, circular dependencies are fragile -- bundler upgrades, tree-shaking changes, or module initialization order changes can break them silently. It also makes testing harder (mocking one requires the other).
- **Fix:** Remove the direct `useValidationStore.getState().setStale(true)` calls from `mappingStore`. Instead, use the existing `subscribeValidationToMappings()` pattern (already in `validationStore.ts:73`) which subscribes externally. The subscription is already wired in `App.tsx:29`. The direct calls inside `addMapping`, `removeMapping`, `clearMappingsForSource`, `removeMappingsForSource`, `createGroup`, `ungroupMappings`, `removeInvalidMappings`, and `undoLastRemoval` are all redundant given the subscription fires on any state change.

### 3. Fusion pipeline silently swallows SPARQL errors
- **File:** `src/lib/fusion.ts:93-96`
- **Confidence:** 85
- **Issue:** Failed CONSTRUCT queries are caught with an empty `catch { continue }`. No error is surfaced to the user, no warning is logged, and no indication appears in the UI. If a user writes a syntactically invalid SPARQL query, the fusion result silently omits those mappings.
- **Why it matters:** For a learning tool, silent failures are the worst outcome -- the user sees partial results with no indication of what went wrong, making debugging impossible.
- **Fix:** Accumulate errors per-query and surface them:
  ```ts
  } catch (err) {
    sourceSummaries.push({ sourceId: source.id, sourceName: source.name, quadCount: 0,
      error: err instanceof Error ? err.message : 'Query failed' })
    continue
  }
  ```
  Then display them in `FusedTab`.

---

## Important Issues

### 4. `updateMapping` and `removeMapping` iterate ALL sources unnecessarily
- **File:** `src/store/mappingStore.ts:126-134` and `112-124`
- **Confidence:** 80
- **Issue:** Both `updateMapping` and `removeMapping` iterate over every source's mapping list to find the target mapping. The mapping itself contains `sourceId`, which could be used for O(1) lookup.
- **Why it matters:** With many sources and mappings, every single mapping edit triggers a full scan and replacement of every source's array. For the current scale this is fine, but it's an easy architectural improvement.
- **Fix:** For `updateMapping`, look up the mapping first to get its `sourceId`, then only modify that one entry. For `removeMapping`, similarly scan for the id once, then filter only the relevant source list.

### 5. `useAutoSave` `scheduleSave` captures stale closure
- **File:** `src/hooks/useAutoSave.ts:118-149`
- **Confidence:** 78
- **Issue:** `scheduleSave` is defined as a plain function inside the hook but references `setSaveStatus` via closure. Since it's called from `useEffect` subscriptions created with `[]` deps, this is actually fine because `setSaveStatus` is a stable React state setter. However, `scheduleSave` itself is re-created on every render but the `useEffect` on line 152 only captures the initial version (empty deps). This means if the component re-renders, the subscription still calls the original `scheduleSave`, which works only because nothing in the closure actually changes.
- **Why it matters:** This is fragile coupling. If any mutable state is ever added to `scheduleSave`'s closure, it will be stale.
- **Fix:** Wrap `scheduleSave` in `useCallback` or `useRef` to make the stability guarantee explicit.

### 6. `instanceGenerator` always walks from "Root" class -- ignores actual schema structure
- **File:** `src/lib/shacl/instanceGenerator.ts:80`
- **Confidence:** 82
- **Issue:** `walkValue(parsed, 'Root', 0)` always starts from a class named "Root" regardless of what the actual schema nodes define. If the JSON has an array wrapper like `{"tracks": [...]}`, the walker creates instances of type `uriBase + 'Root'` for the root level, but `uriBase + 'Tracks'` for the array items. The schema nodes from `jsonToSchema` generate a class named `Tracks`, not `Root`. This means the Root-level instances have a type that doesn't match any schema class.
- **Why it matters:** The SHACL validation and CONSTRUCT execution use `rdf:type` matching, so extra "Root" instances just get ignored. But if validation ever checks for unknown types, these phantom instances would cause false positives.
- **Fix:** Accept the root class name as a parameter rather than hardcoding "Root", or detect the wrapper pattern and walk into the array items directly.

### 7. `derivePrefix` is duplicated across files
- **File:** `src/lib/sparql.ts:266-272` and `src/lib/rdf.ts:47-53` (`prefixFromUri`)
- **Confidence:** 85
- **Issue:** `derivePrefix` in `sparql.ts` and `prefixFromUri` in `rdf.ts` do the exact same thing -- extract the namespace prefix from a URI by splitting at `#` or `/`. The CLAUDE.md explicitly says "Always import `localName` from `src/lib/rdf.ts` -- never re-implement; divergence silently breaks handle matching." The same principle should apply to prefix derivation.
- **Fix:** Remove `derivePrefix` from `sparql.ts` and import `prefixFromUri` from `rdf.ts`.

### 8. `serializeToTurtle` is fully duplicated between `jsonToSchema.ts` and `xmlToSchema.ts`
- **File:** `src/lib/jsonToSchema.ts:192-273` and `src/lib/xmlToSchema.ts:168-248`
- **Confidence:** 90
- **Issue:** The two `serializeToTurtle` functions are byte-for-byte identical (same parameters, same logic, same error handling). This violates DRY.
- **Fix:** Extract into a shared utility in `src/lib/rdf.ts` or a new `src/lib/schemaSerializer.ts`.

### 9. `toPascalCase` and `xsdRangeShort` duplicated across three files
- **File:** `src/lib/jsonToSchema.ts:48-61`, `src/lib/xmlToSchema.ts:30-33`, `src/lib/shacl/instanceGenerator.ts:9-19`
- **Confidence:** 85
- **Issue:** `toPascalCase` appears in 3 files with identical logic. `xsdRangeShort` appears in both `jsonToSchema.ts` and `instanceGenerator.ts` with identical logic.
- **Fix:** Extract both into shared utility functions.

### 10. No `runValidation` button in the UI -- validation must be triggered programmatically
- **File:** `src/components/panels/ValidationPanel.tsx`
- **Confidence:** 78
- **Issue:** The ValidationPanel shows "Click Validate to run" but has no Validate button. The `runValidation` action exists on the store but the panel only displays results. Looking at the entire codebase, there is no UI element that calls `runValidation()`.
- **Why it matters:** Users see "Click Validate to run" but have no way to trigger it through the UI. This is a broken UX flow.
- **Fix:** Add a "Run Validation" button that calls `useValidationStore.getState().runValidation()`.

---

## Minor Issues

### 11. `STANDARD_NAMESPACES` exported but unused externally
- **File:** `src/lib/rdf.ts:57`
- **Confidence:** 95 (confirmed by static analysis)
- **Issue:** Exported but only used internally by `shortenRange` in the same file.
- **Fix:** Remove the `export` keyword.

### 12. Unused dependencies in `package.json`
- **Confidence:** 95 (confirmed by static analysis)
- **Issue:** `@testing-library/dom`, `@codemirror/commands`, `@codemirror/language`, `@codemirror/theme-one-dark` are listed but not imported anywhere.
- **Fix:** Remove from `package.json`.

### 13. `edge.data!` non-null assertions in `rdf.ts`
- **File:** `src/lib/rdf.ts:206,336,339`
- **Confidence:** 78
- **Issue:** Multiple `edge.data!` non-null assertions. The `OntologyEdge` type allows `data` to be undefined (it's an optional property on the React Flow `Edge` type), so these could throw at runtime if edge data is somehow missing.
- **Fix:** Add null checks or use optional chaining with early returns (like `xmlToSchema.ts` already does at line 235).

### 14. `Date.now()` used as ID for canvas-created edges
- **File:** `src/components/canvas/OntologyCanvas.tsx:283,577,581`
- **Confidence:** 76
- **Issue:** IDs like `source_edge_${Date.now()}` can collide if two edges are created within the same millisecond (e.g., rapid double-click). `crypto.randomUUID()` is used elsewhere and is collision-safe.
- **Fix:** Use `crypto.randomUUID()` consistently.

### 15. `window.prompt` for rename is a poor UX pattern
- **File:** `src/components/canvas/OntologyCanvas.tsx:496`
- **Confidence:** 76
- **Issue:** `window.prompt` blocks the main thread and looks jarring in a modern React app. It also cannot be styled or tested easily in Playwright E2E tests.
- **Fix:** Use a controlled dialog component (the codebase already has `ConfirmDialog`).

### 16. `onInvalidateMappings` callback stored in Zustand state is an anti-pattern
- **File:** `src/store/ontologyStore.ts:37`
- **Confidence:** 77
- **Issue:** Storing a function reference (`onInvalidateMappings`) in Zustand state means it gets serialized (or attempted) during IDB persistence, and it creates a tight coupling where the ontology store has to know about mapping invalidation.
- **Fix:** Use a Zustand subscription or event emitter pattern instead.

### 17. Stale closure risk in `SourcePanel.debouncedUpdate`
- **File:** `src/components/panels/SourcePanel.tsx:118-178`
- **Confidence:** 78
- **Issue:** The `debouncedUpdate` callback captures `sources`, `banner`, `clearMappingsForSource`, `updateSource` from the render closure, but the `useMemo` deps are only `[source?.id]`. If `sources` changes (e.g., another source is renamed) while the debounce timer is pending, the callback reads stale `sources` to find the source name.
- **Fix:** Read `sources` from `useSourcesStore.getState()` inside the callback instead of closing over the hook value.

### 18. Layout `visit()` has no cycle protection
- **File:** `src/lib/layout.ts:53-59`
- **Confidence:** 76
- **Issue:** The DFS `visit()` function does not track visited nodes. If edges form a cycle (e.g., two classes with mutual subclass edges), it will recurse infinitely and crash the tab.
- **Fix:** Add a `visited` Set and skip already-visited nodes.

---

## Nitpicks

### 19. Inconsistent URI prefix scheme: `http://src_name_#` vs `http://example.org/name#`
- **File:** `src/lib/jsonToSchema.ts:296` uses `http://src_name_#`; `src/lib/xmlToSchema.ts:27` uses `http://example.org/name#`
- **Confidence:** 80
- **Issue:** JSON sources get URIs like `http://src_norwegianradar_#Track` while XML sources get `http://example.org/norwegianradar#Track`. The two generators use different URI schemes for the same concept.
- **Fix:** Unify the URI prefix derivation.

### 20. E2E test fixtures not reviewed
- **Confidence:** N/A
- **Issue:** E2E tests in `e2e/` were not in scope but are referenced in git status as modified. These should be reviewed separately.

### 21. `SparqlEditor` re-mounts on `readOnly` change
- **File:** `src/components/panels/MappingPanel.tsx:66`
- **Confidence:** 75
- **Issue:** The `useEffect` dependency is `[readOnly]`, which destroys and recreates the entire CodeMirror instance when switching between a grouped (read-only) and ungrouped mapping. This causes a visible flicker.
- **Fix:** Use `EditorView.dispatch` with a state reconfiguration facet instead of remounting.

### 22. `FusedTab` subscribes to mapping/source changes independently of `subscribeFusionToMappings`
- **File:** `src/components/panels/OutputPanel.tsx:45-49`
- **Confidence:** 75
- **Issue:** `FusedTab` sets up its own subscription to mark fusion stale, but `subscribeFusionToMappings()` (exported from `fusionStore.ts:56`) does the same thing. The fusion subscription is never called anywhere in the codebase. Either use the centralized one or remove it.

### 23. `sourceCanvasToTurtle` has an unused `_uriPrefix` parameter
- **File:** `src/lib/rdf.ts:366`
- **Confidence:** 90
- **Issue:** Parameter is eslint-disabled as unused and never used in the function body.
- **Fix:** Remove the parameter.

---

## Positive Observations

- **Clean store architecture.** The Zustand stores have well-defined interfaces with clear JSDoc comments. The separation into ontology/sources/mappings/validation/fusion/ui stores is logical and each has a focused responsibility.

- **Excellent type safety.** TypeScript types flow correctly from the `types/index.ts` through stores to components. The `MappingGroup` discriminated union is well-designed. Type guards for IDB restoration (`isValidMappings`, `isValidGroups`) validate shape properly.

- **Robust bidirectional sync.** The `useOntologySync` and `useSourceSync` hooks correctly implement the `isUpdatingFrom*` flag pattern to prevent circular updates between the Turtle editor and the canvas. The `hasPendingEdits` guard in App.tsx shows thoughtful handling of the editor-canvas conflict.

- **Good test coverage for core logic.** `rdf.test.ts` has thorough round-trip tests. `sparql.test.ts` covers all 7 mapping kinds. `mappingStore.test.ts` tests idempotency and edge cases. `shacl.test.ts` tests the full pipeline from shapes through validation.

- **Defensive error handling in most places.** `parseTurtle` properly rejects on invalid Turtle. `jsonToSchema` handles circular references, empty inputs, primitive roots, and null values. `useAutoSave` handles IDB write failures gracefully.

- **Smart IDB migration pattern.** `migrateSource()` in `sourcesStore.ts` safely upgrades persisted records from older schema versions without data loss.

- **Consistent canvas color semantics.** Source nodes (amber) and master ontology nodes (blue) are clearly differentiated, matching the project convention.

- **Thoughtful UX details.** Stale badges on validation/fusion results, format-change banners on source panel, prefix collision detection, undo toast on mapping removal.

---

## Recommendations

1. **Break the circular dependency** (Critical #2) -- this is the single most impactful architectural improvement. Remove the 7 direct `useValidationStore.getState().setStale(true)` calls from `mappingStore.ts` since the subscription already handles it.

2. **Extract shared utilities** -- `serializeToTurtle`, `toPascalCase`, `xsdRangeShort`, and `derivePrefix/prefixFromUri` should each live in one place. This would eliminate ~150 lines of duplication.

3. **Add the missing Validate button** -- users literally cannot trigger validation right now.

4. **Surface fusion errors** -- for a learning tool, feedback is everything. Show which SPARQL queries failed and why.

5. **Consider extracting OntologyCanvas** -- at 722 lines with 46 cyclomatic complexity, it would benefit from extracting the edge-type picker, group prompt, and context menus into separate components with their own state.

---

## Assessment

**Ready to merge: N/A (full codebase review, not a PR)**

**Overall quality: 7.5/10.** The codebase is well-organized with good separation of concerns and solid test coverage for core RDF logic. The three critical issues (undo race condition, circular dependency, silent fusion errors) should be addressed, and the DRY violations in the schema generators are the main code quality concern. For a client-side learning tool with no backend, the architecture is sound and the patterns are consistent.
