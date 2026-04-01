# Gap Analysis Report

**Date:** 2026-04-01
**Scope:** Full codebase — src/lib, src/store, src/hooks, src/__tests__, e2e/

---

## Summary

- **Gaps found: 19 total (3 critical, 8 important, 8 minor)**

---

## Untested Code Paths

### Coverage Matrix

| Module | Has Tests? | Notes |
|--------|-----------|-------|
| `src/lib/rdf.ts` | Yes (`rdf.test.ts`) | |
| `src/lib/sparql.ts` | Yes (`sparql.test.ts`) | |
| `src/lib/jsonToSchema.ts` | Yes (`jsonToSchema.test.ts`) | |
| `src/lib/xmlToSchema.ts` | Yes (`xmlToSchema.test.ts`) | |
| `src/lib/fusion.ts` | Yes (`fusion.test.ts`) | |
| `src/lib/rml.ts` | Yes (`rml.test.ts`) | |
| `src/lib/yarrrml.ts` | Yes (`yarrrml.test.ts`) | |
| `src/lib/detectFormat.ts` | Yes (`detectFormat.test.ts`) | |
| `src/lib/shacl/*` | Yes (`shacl.test.ts`) | |
| **`src/lib/layout.ts`** | **NO** | Tree layout algorithm untested |
| **`src/lib/jsonldFramer.ts`** | **NO** | JSON-LD compaction untested |
| **`src/lib/codemirror-theme.ts`** | **NO** | Config-only, low risk |
| **`src/lib/utils.ts`** | **NO** | Utility functions untested |
| `src/store/ontologyStore.ts` | Yes (`store.test.ts`, `ontologyCanvasEditor.test.ts`) | |
| `src/store/sourcesStore.ts` | Yes (`sourceMigration.test.ts`) | |
| `src/store/mappingStore.ts` | Yes (`mappingStore.test.ts`, `mappingGroups.test.ts`) | |
| `src/store/validationStore.ts` | Yes (`validationStore.test.ts`) | |
| **`src/store/fusionStore.ts`** | **Partial** | Tested via `fusion.test.ts` (lib only), store actions not directly tested |
| **`src/store/uiStore.ts`** | **NO** | Trivial state, low risk |
| `src/hooks/useAutoSave.ts` | Yes (`autoSave.test.ts`) | |
| `src/hooks/useCanvasData.ts` | Yes (`useCanvasData.test.ts`) | |
| `src/hooks/useOntologySync.ts` | Yes (`useOntologySync.test.ts`) | |
| `src/hooks/useSourceSync.ts` | Yes (`useSourceSync.test.ts`) | |

### Gaps

1. **`src/lib/layout.ts` — No unit tests** — The tree layout algorithm (`applyTreeLayout`) is used by both `jsonToSchema` and `xmlToSchema` to position nodes. Incorrect layout would cause overlapping nodes on the canvas. — **Impact: Medium** — **Next: write tests**

2. **`src/lib/jsonldFramer.ts` — No unit tests** — The JSON-LD compaction wrapper is used in the OUTPUT panel export. A regression here would produce broken JSON-LD output. — **Impact: Medium** — **Next: write tests**

3. **`src/store/fusionStore.ts` — Store actions untested** — The `runFusion` action (which calls `executeAllConstructs`) is not directly tested at the store level. Only the underlying lib function has tests. The store-level loading/error state machine is unverified. — **Impact: Low-Medium** — **Next: write tests**

4. **`src/lib/fusion.ts` — Silent error swallowing in CONSTRUCT execution** — Lines 71 and 94: both `jsonToInstances` failure and individual SPARQL query failures are silently caught with `continue`. No test exercises these error paths. — **Impact: Medium** — **Next: write tests for error paths**

---

## Unhandled Error States

### Critical

1. **No React Error Boundary in the component tree** — `grep` for `ErrorBoundary`, `componentDidCatch`, `getDerivedStateFromError` returns **zero results**. If any render-time exception occurs (e.g., malformed RDF data causing a crash in a node component, or React Flow internals throwing), the entire app white-screens with no recovery path.
   - **File:** `src/App.tsx` (or nearest layout wrapper)
   - **Impact: Critical** — unrecoverable crash, user loses work
   - **Next: /fix** — add an ErrorBoundary at the app root and around the canvas

2. **`validationStore.ts:49-53` — First source failure aborts remaining validations** — When validation of one source throws, the catch block sets `loading: false` and `return`s immediately. Remaining sources are never validated. The `results` dict is discarded (not set), so the UI shows stale results from a prior run mixed with the error state.
   - **File:** `src/store/validationStore.ts:49-53`
   - **Impact: Important** — partial validation failure looks like total failure
   - **Next: /fix** — accumulate per-source errors, set results for successful sources

3. **`fusion.ts:71,94` — Silent `continue` on errors** — Both `jsonToInstances` parse failure (line 71) and SPARQL query failure (line 94) silently skip the source/query. The user has no indication that a source was skipped or that a CONSTRUCT query failed. The `FusionResult.sources` array simply omits the failed source, making it look like the source had zero quads rather than an error.
   - **File:** `src/lib/fusion.ts:71,94`
   - **Impact: Important** — user cannot debug why a source produces no output
   - **Next: /fix** — add `errors` or `warnings` field to `FusionResult`

### Important

4. **`useOntologySync.ts:82` — Canvas-to-editor serialization failure silently ignored** — When `canvasToTurtle` throws, the catch block does nothing (no `setParseError`, no console output). The user's canvas edits appear to succeed but never reflect in the editor.
   - **File:** `src/hooks/useOntologySync.ts:82`
   - **Impact: Medium** — silent data desync between canvas and editor
   - **Next: /fix** — at minimum log a warning or set a parseError

5. **`useSourceSync.ts:125` — Same pattern: source canvas-to-editor serialization failure silently ignored**
   - **File:** `src/hooks/useSourceSync.ts:125`
   - **Impact: Medium** — same as above for source schemas

6. **`useAutoSave.ts:79,94` — IDB restore failures silently swallowed** — On app startup, if IDB data is corrupt, the catch blocks only `console.warn`. The user sees an empty project with no indication that their saved work failed to load. The `saveStatus` is never set to `'error'`.
   - **File:** `src/hooks/useAutoSave.ts:79,94`
   - **Impact: Medium** — user may think their project was lost when it's actually a restore bug

---

## Incomplete Features

1. **No TODO/FIXME/HACK/PLACEHOLDER markers found** — `grep` across entire `src/` returned zero results. This is a positive signal; no known incomplete stubs.

---

## Missing Edge Cases

1. **`instanceGenerator.ts:35` — Empty `schemaNodes` array dereference** — `schemaNodes[0]?.data.prefix ?? ''` falls back to empty string, producing URIs like `Root` with no namespace prefix. `walkValue` then creates triples with bare local names as URIs (e.g., `<Root>` instead of `<http://src_foo_#Root>`). SHACL validation may silently pass because shapes won't match these malformed URIs.
   - **File:** `src/lib/shacl/instanceGenerator.ts:35`
   - **Impact: Important** — silent validation false-negatives
   - **Next: /fix** — return empty store immediately when uriBase is empty

2. **`mappingStore.ts:3` <-> `validationStore.ts:5` — Circular dependency** — `mappingStore` imports `validationStore` (to call `setStale`), and `validationStore` imports `mappingStore` (via `useMappingStore.getState()`). This works at runtime due to Zustand's lazy resolution, but bundlers may produce undefined imports in edge cases, and it makes the dependency graph fragile.
   - **File:** `src/store/mappingStore.ts:3`, `src/store/validationStore.ts:5`
   - **Impact: Important** — fragile architecture, risk of undefined-at-import-time bugs
   - **Next: /fix** — extract `setStale` calls into `subscribeValidationToMappings()` (which already exists at line 73 of validationStore) and remove the direct import from mappingStore

3. **`validationStore.ts:31-56` — No cancellation of in-flight validation** — If the user triggers validation, then edits mappings, then triggers validation again, the first run completes and overwrites results before the second run starts (due to the `loading` guard). However, if the first run is slow (large dataset + Comunica), the UI shows stale loading state with no way to cancel.
   - **File:** `src/store/validationStore.ts:31`
   - **Impact: Minor** — UX friction, not data corruption

4. **`fusion.ts:55` — Source with whitespace-only `rawData` is skipped** — `source.rawData.trim() === ''` skips the source, but the user isn't told why a source with `"  "` as data produces zero output.
   - **File:** `src/lib/fusion.ts:55`
   - **Impact: Minor** — confusing UX for empty/whitespace sources

---

## Dead Code / Unwired Code

1. **`src/lib/rdf.ts:57` — `STANDARD_NAMESPACES` exported but never imported** — Confirmed by Fallow. Dead export.
   - **Recommendation:** Remove export or make it `const` (non-exported)

2. **Unused dependencies: `@testing-library/dom`, `@codemirror/commands`, `@codemirror/language`, `@codemirror/theme-one-dark`** — Confirmed by Fallow. These inflate `node_modules` and potentially the bundle (CodeMirror deps).
   - **Recommendation:** Remove from `package.json`

3. **`src/lib/shacl/validator.ts` — Fallow reports 50% dead code ratio** — The file is only 69 lines. The `ShaclFactory` export (line 7) and `ViolationRecord` type are used, and `validateWithShacl` is used via `shacl/index.ts`. The "50% dead code" likely comes from Fallow counting the re-exported `defaultEnv` import path or internal helper logic within the catch block. Worth auditing but not actionable without Fallow's specific line-level report.
   - **Recommendation:** Audit with `--detail` flag; likely a false positive at module level

4. **`src/lib/shacl/instanceGenerator.ts` — `toPascalCase` and `xsdRangeShort` are local duplicates** — These same functions exist in `src/lib/jsonToSchema.ts`. Not dead code per se, but violates DRY.
   - **Recommendation:** Extract to shared utility if refactoring

---

## Architecture Observations

### Strengths
- Excellent test coverage ratio: 20 unit test files covering 17 lib/store/hook modules
- 16 E2E specs covering all major user flows
- Bidirectional sync hooks properly use ref-based guards to prevent circular updates
- Stores properly surface `loading`/`error` states in the UI (OutputPanel, ValidationPanel, Header)
- No TODO/FIXME debt — codebase is clean of incomplete markers
- Error handling in sync hooks correctly uses `parseError` state for user-visible feedback

### Key Risks
- **No ErrorBoundary** is the single biggest production risk
- **Circular dependency** between mapping and validation stores is a ticking time bomb
- **Silent error swallowing** in fusion pipeline makes debugging impossible for end users

---

## Priority Action Items

| # | Severity | Item | Effort |
|---|----------|------|--------|
| 1 | Critical | Add React ErrorBoundary to App root + canvas | Small |
| 2 | Critical | Break circular dependency mappingStore <-> validationStore | Small |
| 3 | Critical | Fix validationStore partial failure handling | Small |
| 4 | Important | Add warnings/errors to FusionResult for skipped sources | Medium |
| 5 | Important | Fix instanceGenerator empty schemaNodes edge case | Small |
| 6 | Important | Surface canvas-to-editor serialization failures | Small |
| 7 | Important | Surface IDB restore failures to user (not just console) | Small |
| 8 | Important | Write unit tests for `layout.ts` | Medium |
| 9 | Important | Write unit tests for `jsonldFramer.ts` | Medium |
| 10 | Minor | Remove `STANDARD_NAMESPACES` dead export | Trivial |
| 11 | Minor | Remove 4 unused npm dependencies | Trivial |
| 12 | Minor | Extract duplicate `toPascalCase`/`xsdRangeShort` utils | Small |
