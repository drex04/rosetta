# Comprehensive Codebase Review Report

**Date:** 2026-04-01
**Scope:** Full codebase (not a PR diff)
**Reviewer:** Claude Opus 4.6

---

## Code Quality + Architecture

- **Score: 7.5/10**
- **Critical: 4 | Important: 11 | Minor: 8 | Nitpick: 5**
- **Files analyzed:** 84 source files, 747 functions, 20 unit test files, 16 E2E specs

### Critical Issues

| # | File | Issue | Next Action |
|---|------|-------|-------------|
| 1 | `src/App.tsx` | **No React ErrorBoundary anywhere** — a render-time crash white-screens the entire app with zero recovery. Most dangerous gap in the codebase. | `/fh:fix` |
| 2 | `src/store/mappingStore.ts:289` | **Race condition in `_undoBuffer`** — single-slot undo loses data when `removeInvalidMappings` fires twice before undo. The toast says "Undo" but the data is gone. | `/fh:fix` |
| 3 | `src/store/mappingStore.ts:3` ↔ `src/store/validationStore.ts:5` | **Circular dependency** — mappingStore imports validationStore (7 direct `setStale()` calls) and validationStore imports mappingStore. Works by Zustand luck. The subscription in `subscribeValidationToMappings()` already handles this — the 7 calls are redundant. | `/fh:fix` |
| 4 | `src/lib/fusion.ts:71,94` | **Fusion silently swallows SPARQL errors** — failed CONSTRUCT queries are `catch { continue }`. Users see partial results with zero feedback about what failed. For a learning tool, this is the worst UX outcome. | `/fh:fix` |

### Important Issues

| # | File | Issue | Next Action |
|---|------|-------|-------------|
| 5 | `src/store/validationStore.ts:49-53` | **First source error aborts all remaining validations** — partial failure looks like total failure, stale results persist | `/fh:fix` |
| 6 | `src/components/panels/ValidationPanel.tsx` | **No "Validate" button** — UI says "Click Validate to run" but no button exists; users literally cannot trigger validation | `/fh:fix` |
| 7 | `src/lib/shacl/instanceGenerator.ts:35` | **Empty `schemaNodes` produces malformed URIs** — SHACL validation silently passes on invalid data | `/fh:fix` |
| 8 | `src/hooks/useOntologySync.ts:82` + `useSourceSync.ts:125` | **Canvas-to-editor serialization failures silently ignored** — data desyncs without feedback | `/fh:fix` |
| 9 | `src/hooks/useAutoSave.ts:79,94` | **IDB restore failures only `console.warn`** — user sees empty project with no error indication | `/fh:fix` |
| 10 | `src/lib/jsonToSchema.ts:192` + `xmlToSchema.ts:168` | **`serializeToTurtle` duplicated byte-for-byte** (~80 lines each) | `/fh:refactor` |
| 11 | `src/lib/sparql.ts:266` vs `rdf.ts:47` | **`derivePrefix`/`prefixFromUri` duplicated** — divergence risk per CLAUDE.md rule | `/fh:refactor` |
| 12 | `src/lib/jsonToSchema.ts:48` + `xmlToSchema.ts:30` + `instanceGenerator.ts:9` | **`toPascalCase`/`xsdRangeShort` duplicated across 3 files** | `/fh:refactor` |
| 13 | `src/store/mappingStore.ts:126` | **`updateMapping`/`removeMapping` iterate ALL sources** — O(n) scan when O(1) is available via `sourceId` | `/fh:refactor` |
| 14 | `src/lib/layout.ts` | **No unit tests** — tree layout algorithm untested, incorrect layout → overlapping canvas nodes | write tests |
| 15 | `src/lib/jsonldFramer.ts` | **No unit tests** — JSON-LD export untested | write tests |

### Minor Issues

| # | File | Issue |
|---|------|-------|
| 16 | `src/lib/rdf.ts:57` | `STANDARD_NAMESPACES` exported but unused (confirmed by Fallow) |
| 17 | `package.json` | 4 unused deps: `@testing-library/dom`, `@codemirror/commands`, `@codemirror/language`, `@codemirror/theme-one-dark` |
| 18 | `src/lib/rdf.ts:206,336,339` | `edge.data!` non-null assertions — could throw if edge data missing |
| 19 | `src/components/canvas/OntologyCanvas.tsx:283,577` | `Date.now()` used as edge IDs — collision risk on rapid creation |
| 20 | `src/components/canvas/OntologyCanvas.tsx:496` | `window.prompt` for rename — blocks main thread, untestable |
| 21 | `src/store/ontologyStore.ts:37` | `onInvalidateMappings` callback stored in Zustand state — anti-pattern (not serializable) |
| 22 | `src/components/panels/SourcePanel.tsx:118` | Stale closure in `debouncedUpdate` — captures `sources` from render instead of `getState()` |
| 23 | `src/lib/layout.ts:53-59` | DFS `visit()` has no cycle protection — mutual subclass edges → infinite recursion |

---

## Gap Analysis

- **Untested paths: 4** | **Unhandled errors: 6** | **Incomplete features: 0** | **Edge cases: 4**
- Zero TODO/FIXME/HACK markers (clean codebase)
- 20 unit test files covering 17 lib/store/hook modules — excellent ratio
- Key untested: `layout.ts`, `jsonldFramer.ts`, `fusionStore` actions, fusion error paths

---

## Evidence

| Check | Result |
|-------|--------|
| **Unit Tests** | 237 passed, 0 failed (exit 0). 15 E2E files errored due to vitest picking up Playwright specs — known gotcha, not a real failure. |
| **Build** | PASS (exit 0). 6394 modules, 2 chunks warned >500KB (1.6MB + 2.1MB pre-gzip, ~1MB gzipped). Bundle size is a concern for production but acceptable for a learning tool. |
| **Lint** | 1 warning: `MappingPanel.tsx:157` missing useEffect deps (`selectedMapping`, `updateMapping`). 1 false error in playwright cache file. |

---

## Static Analysis (Fallow)

| Metric | Value |
|--------|-------|
| Files analyzed | 84 |
| Functions analyzed | 747 |
| Functions above complexity threshold | 8 |
| Average maintainability | 90.8 |
| Average cyclomatic | 1.7 (P90: 3) |
| Dead file % | 0% |
| Dead export % | 5.3% |
| Unused dependencies | 5 |
| Circular dependencies | 1 |

**Complexity hotspots:** MappingPanel (cyc:46), generateConstruct (cyc:28), SourcePanel (cyc:26), isValidConnection (cyc:24), parseTurtle (cyc:23), onConnect (cyc:21), jsonToSchema (cyc:20)

---

## Gate Decision: WARN

**Reasoning:** No blocking evidence failures (tests pass, build succeeds, lint is clean). However, 4 critical code quality issues and 11 important issues warrant attention. Since this is a full codebase review (not a PR gate), the codebase is in good shape overall (7.5/10) with clear, prioritized action items.

---

## Recommended Next Actions (Priority Order)

1. **`/fh:fix` — ErrorBoundary** — Add error boundary at App root + canvas wrapper. Small effort, eliminates the #1 production risk.

2. **`/fh:fix` — Break circular dependency** — Remove 7 `setStale()` calls from mappingStore, rely on existing subscription. Small effort, cleanest architectural win.

3. **`/fh:fix` — Surface fusion errors** — Add `errors` field to `FusionResult`, populate on CONSTRUCT failure, display in FusedTab. Medium effort.

4. **`/fh:fix` — Undo buffer race condition** — Change `_undoBuffer` from single-slot to stack. Small effort.

5. **`/fh:fix` — Validation partial failure + missing button** — Fix `runValidation` to continue on per-source errors, add Validate button to panel. Small effort.

6. **`/fh:refactor` — DRY extraction** — Extract `serializeToTurtle`, `toPascalCase`, `xsdRangeShort`, `derivePrefix` into shared utilities. ~150 lines of duplication eliminated.

7. **Write tests** — `layout.ts` and `jsonldFramer.ts` unit tests. Medium effort.

---

## Positive Observations

- Clean Zustand store architecture with well-defined interfaces and focused responsibilities
- Excellent type safety — TypeScript types flow correctly through stores to components
- Robust bidirectional sync with `isUpdatingFrom*` ref guards
- Strong test coverage: 20 unit test files + 16 E2E specs
- Zero TODO/FIXME debt
- Smart IDB migration pattern for persisted data
- Thoughtful UX: stale badges, format-change banners, prefix collision detection, undo toasts
- Consistent canvas color semantics (amber/blue/green convention)
