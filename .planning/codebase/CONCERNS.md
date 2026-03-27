# Codebase Concerns

**Analysis Date:** 2026-03-27

## Tech Debt

**JSON to Schema Converter — Circular Reference Detection Overhead:**
- Issue: `jsonToSchema` uses `WeakSet` for cycle detection and adds/deletes objects repeatedly during walk. While correct, the pattern is O(n) with high constant factors for large nested JSON objects.
- Files: `src/lib/jsonToSchema.ts` (lines 98-130)
- Impact: Large JSON inputs (>10k objects) may cause noticeable parsing slowdown and garbage collection pressure.
- Fix approach: Profile with real-world NATO datasets. Consider object pooling for the visited set or lazy initialization only when actual cycles detected.

**Type Casts in N3.js Bindings:**
- Issue: N3.js TypeScript definitions force `as unknown as N3.Term` casts in `parseTurtle()` and `canvasToTurtle()`. Multiple cast chains (lines 127, 134, 151, 183, 195).
- Files: `src/lib/rdf.ts` (lines 89-96, 127-195)
- Impact: Masks potential runtime type mismatches. Changes to N3.js versions could introduce silent failures.
- Fix approach: Wrap N3 API calls in strongly-typed helper functions. Consider upgrading to N3 v3 if TypeScript support improves.

**Debounce Cleanup Spread Across Multiple Hooks:**
- Issue: Three separate debounce patterns implemented: `useAutoSave`, `useOntologySync`, `SourcePanel`. Each handles cleanup slightly differently (return vs. explicit cleanup in arrays).
- Files: `src/hooks/useAutoSave.ts` (lines 36-47, 94-122), `src/hooks/useOntologySync.ts` (lines 19-30, 39-69), `src/components/panels/SourcePanel.tsx` (lines 19-27)
- Impact: Inconsistent cleanup logic increases risk of timer leaks. Hard to audit all paths.
- Fix approach: Extract `useDebounce` hook that returns cleanup function and memoized callback. Use in all three locations.

**WeakSet Object Tracking in jsonToSchema Fragility:**
- Issue: `ctx.visited.add(value)` / `ctx.visited.delete(value)` tracking assumes object identity stability. If objects are cloned or wrapped by middleware, cycles won't be detected.
- Files: `src/lib/jsonToSchema.ts` (lines 98-118, 126-131)
- Impact: Certain JSON shapes (proxies, frozen objects, custom getters) could cause stack overflow or infinite loops.
- Fix approach: Add fallback depth limit. Document JSON shape requirements. Test with JSON.parse variants.

## Known Bugs

**Bidirectional Sync Race Condition — Editor ↔ Canvas:**
- Symptoms: Rapid keyboard input in Turtle editor while dragging canvas nodes can cause inconsistent state: editor shows one shape, canvas shows another.
- Files: `src/hooks/useOntologySync.ts` (lines 35-87), `src/components/canvas/OntologyCanvas.tsx` (lines 74-81)
- Trigger: (1) Type fast in Turtle editor (2) Drag node on canvas before debounce fires (3) Observe misalignment.
- Root Cause: `debounceTimer` in editor (600ms) vs. canvas debounce (100ms) have different timeouts. If canvas fires while editor is still debounced, `isUpdatingFromEditor` flag doesn't block it properly.
- Workaround: Wait 700ms between editor input and canvas changes.
- Fix approach: Unify debounce delays. Use compound flag: `isSyncInFlight` blocks all updates, not just one direction.

**IDB Restore Loss on Parsing Error:**
- Symptoms: User loads app with saved invalid Turtle. Raw text restores to editor, but parse error banner displays. On page refresh, Turtle is gone (lost to subsequent save that serializes empty nodes/edges).
- Files: `src/hooks/useAutoSave.ts` (lines 39-80), `src/store/ontologyStore.ts` (lines 53-58)
- Trigger: Save valid project → manually edit Turtle in exported file → import → refresh page before fixing syntax.
- Root Cause: `loadTurtle` atomically sets `turtleSource + nodes + edges`. If parse fails, nodes/edges stay empty but turtleSource was set. Later auto-save snapshots this empty state.
- Workaround: Never refresh after failed parse; fix the Turtle and re-paste.
- Fix approach: Store raw Turtle separately from parsed state. On IDB restore parse error, lock auto-save until user confirms they want to discard work.

**Mapping Deduplication by URI Signatures Can Hide Semantics:**
- Symptoms: Create mapping A: Track.id → Identity.id. Delete A. Recreate with same URIs. New mapping gets same ID (RD-04 idempotency).
- Files: `src/store/mappingStore.ts` (lines 41-50)
- Trigger: User maps two source fields that happen to point to same target, deletes one, recreates it.
- Root Cause: `addMapping` deduplication key is (sourceClassUri, sourcePropUri, targetClassUri, targetPropUri). Doesn't include `kind` or `sparqlConstruct`.
- Impact: Two different transformation semantics (direct vs. SPARQL) can't coexist for same URIs.
- Fix approach: Include `kind` in dedup key. Generate different mapping IDs for semantically different transforms.

## Security Considerations

**No Input Validation on SPARQL CONSTRUCT Templates:**
- Risk: `sparql.ts` builds CONSTRUCT queries from user-entered URIs by simple string concatenation. If a URI contains `}` or newlines, query syntax could break or be injected.
- Files: `src/lib/sparql.ts` (lines 17-29)
- Current mitigation: Output is display-only (read-only CodeMirror); not executed.
- Recommendations: Add URI format validation. Escape triple-quote delimiters in URIs. Consider using templated SPARQL builder library.

**Crypto.randomUUID Dependency on Platform Support:**
- Risk: `crypto.randomUUID()` used for node/edge/mapping IDs. Not available in all browser contexts (e.g., non-secure contexts, old browsers).
- Files: `src/lib/jsonToSchema.ts` (lines 143, 166, 344), `src/store/sourcesStore.ts` (line 24), `src/store/mappingStore.ts` (line 52)
- Current mitigation: Modern browser minimum requirement (ES2023 crypto support assumed).
- Recommendations: Add fallback polyfill. Detect and warn if crypto unavailable. Use uuid library instead for consistency.

**JSON.parse on Untrusted User Input:**
- Risk: `jsonToSchema` calls `JSON.parse()` on user-pasted source data without schema validation. Malicious objects with large prototype chains could cause memory exhaustion.
- Files: `src/lib/jsonToSchema.ts` (lines 282-286), `src/components/panels/SourcePanel.tsx` (lines 95-97)
- Current mitigation: `WeakSet` cycle detection catches recursive objects. Max reasonable object count not enforced.
- Recommendations: Add JSON schema validator (JSON Schema spec). Enforce max object count limit. Stream large inputs.

**IDB Persistence Without Encryption:**
- Risk: `useAutoSave` stores entire project (Turtle + sources + mappings) in IndexedDB plaintext. No encryption, no access control.
- Files: `src/hooks/useAutoSave.ts` (lines 115)
- Current mitigation: Browser sandbox. Local storage only (no network transmission).
- Recommendations: Clarify in docs that IDB is not encrypted. For sensitive NATO data, implement optional encryption before IDB write. Add option to disable auto-save.

## Performance Bottlenecks

**Canvas Rendering with Large Node/Edge Sets:**
- Problem: React Flow re-renders all nodes/edges on any store change. `useCanvasData` uses `useMemo` but still creates new edge arrays on any mapping change.
- Files: `src/hooks/useCanvasData.ts` (lines 28-56), `src/components/canvas/OntologyCanvas.tsx` (lines 35-94)
- Cause: Zustand subscriptions cause full component re-render. Mapping array is reconstructed on every call (O(sources × mappings)).
- Observed: With 5+ sources and 20+ mappings, canvas becomes laggy when dragging nodes.
- Improvement path: Memoize mapping edge construction by mapping ID. Use `useShallow` or selector to limit re-renders. Consider virtualizing edges outside viewport.

**JSON to Schema Conversion on Every Keystroke (Debounced):**
- Problem: `SourcePanel` calls `jsonToSchema()` on 500ms debounce for every keystroke, even partial JSON. Recursive tree walk is O(n×m) for nested objects.
- Files: `src/components/panels/SourcePanel.tsx` (lines 106, 120)
- Cause: No progressive parsing; entire JSON re-walked on each keystroke.
- Observed: Pasting 50KB+ JSON causes 1-2 second lag.
- Improvement path: Incremental parsing. Cache schema for unchanged parts. Use Web Worker for conversion (off-main-thread).

**N3 Store Query on Every Parse:**
- Problem: `parseTurtle` loads entire Turtle into N3.Store, then queries with nested loops: class loop → datatype properties loop → object properties loop. No indexing.
- Files: `src/lib/rdf.ts` (lines 129-211)
- Cause: N3.Store.match() is O(all quads) for each predicate search.
- Observed: Parsing 1000-quad Turtle takes 300ms+.
- Improvement path: Pre-build URI → quad indices. Use N3 SPARQL query engine instead of manual loops. Consider RDF database for large ontologies.

**Three-Layer Canvas Sync Debouncing Creates Visible Lag:**
- Problem: Canvas change → debounce 100ms → serialize → update editor → debounce 600ms → parse. Total delay can reach 700ms for visible feedback.
- Files: `src/hooks/useOntologySync.ts` (line 69), `src/components/canvas/OntologyCanvas.tsx` (lines 78-81)
- Cause: Two independent debounce timers with different delays.
- Observed: Drag a node, release, wait nearly a second for editor to update.
- Improvement path: Remove canvas debounce (serialize is fast). Keep editor debounce only. Or use server-sent events pattern.

## Fragile Areas

**Handle String Matching for Property Connections:**
- Files: `src/components/canvas/OntologyCanvas.tsx` (lines 97-103, 128-129), `src/components/nodes/ClassNode.tsx`, `src/components/nodes/SourceNode.tsx`
- Why fragile: Handles are identified by string prefixes: `prop_`, `target_prop_`. If property labels contain these substrings, handle matching breaks.
- Safe modification: Refactor handle IDs to use URI hash instead of label. Add unit tests for edge cases (labels with spaces, unicode, special chars).
- Test coverage: No tests for handle matching with malformed property names.

**Zustand Store Subscriptions Without Unsubscribe in Components:**
- Files: `src/hooks/useAutoSave.ts` (lines 126-138), logic depends on cleanup happening.
- Why fragile: Three parallel unsubscribe calls in cleanup. If one throws, others don't run.
- Safe modification: Wrap unsubs in try-catch. Test unmount scenarios with rapid source removal.
- Test coverage: `autoSave.test.ts` doesn't cover partial failure cases.

**SourcePanel Key-Based Remounting Assumption:**
- Files: `src/components/layout/RightPanel.tsx` (likely uses `key={activeSourceId}`; not fully reviewed)
- Why fragile: Comments say "SourcePanel is remounted via key={activeSourceId}", but if key mechanism breaks, state sync fails silently.
- Safe modification: Add explicit effect to detect source change and reset state. Remove reliance on implicit key remounting.
- Test coverage: No tests verify remounting happens on activeSourceId change.

**Object Prefix Derivation Collision with Source Names:**
- Files: `src/lib/jsonToSchema.ts` (lines 35-41), `src/components/panels/SourcePanel.tsx` (line 33)
- Why fragile: Two identical functions (`deriveUriPrefix` and `deriveSlug`). If one is updated and the other isn't, prefix collisions silently occur.
- Safe modification: Extract to shared utility. Add unit test that verifies prefix uniqueness for name collision matrix.
- Test coverage: `SourcePanel` has collision detection, but `jsonToSchema` doesn't validate its derived prefixes against existing sources.

## Scaling Limits

**IndexedDB Blob Size Limit:**
- Current capacity: Entire ProjectFile is one IDB blob. Typical project ~100KB. Limit is ~50MB per entry.
- Limit: If user adds 500+ sources with large JSON, or imports massive ontologies, single blob hits quota.
- Scaling path: Split ProjectFile into separate IDB entries (ontology → entry 1, each source → entry N, mappings → entry M). Implement pagination or lazy loading.

**React Flow Canvas Node/Edge Count:**
- Current capacity: Tested up to 50 nodes + 100 edges, interaction smooth.
- Limit: 500+ nodes causes visible frame drops. 1000+ nodes becomes unusable.
- Scaling path: Virtual scrolling (React Flow has built-in support). Off-canvas edge rendering. Cluster deeply nested ontologies into expandable groups.

**N3.js Store Memory Usage:**
- Current capacity: ~10,000 quads in-memory without noticeable slowdown.
- Limit: 100,000+ quads consumes gigabytes due to N3 internal indexing (full index per triple component).
- Scaling path: Implement quad streaming. Use SPARQL endpoint instead of in-memory store. Partition ontologies.

**Browser Event Loop Blocking on Large JSON Parse:**
- Current capacity: 100KB JSON parsed on main thread without UI freeze.
- Limit: 500KB+ JSON causes 3+ second UI freeze during `JSON.parse()`.
- Scaling path: Async parsing with Progress API. Use Worker thread. Implement cancellation tokens.

## Dependencies at Risk

**N3.js TypeScript Types — Misaligned with Runtime:**
- Risk: `@types/n3` definitions are incomplete (missing some overloads, incorrect module exports). Runtime doesn't match types, forcing `as unknown as` casts throughout.
- Impact: Upgrading to N3 v3 or @types/n3 update could break casts silently.
- Migration plan: File issue with N3.js maintainers. Use stricter tsconfig options to force type narrowing. Consider forking type definitions locally.

**Comunica Integration Not Used Yet:**
- Risk: `package.json` imports Comunica but no usage found in Phase 4 code. Phase 5 (SHACL) will add heavy dependency on it.
- Impact: Dead dependency now. Unknown integration points for SHACL queries at runtime.
- Migration plan: Phase 5 implementation will clarify usage. Add proof-of-concept tests before main implementation.

**jsonld Library — Minimal Dependency:**
- Risk: Only used in `OutputPanel` for JSON-LD export. Library is feature-rich but only 1% of features used.
- Impact: Adds ~50KB to bundle for single export format.
- Migration plan: Consider inline JSON-LD builder or lightweight alternative. Benchmark bundle size impact.

**vite-plugin-node-polyfills — Crypto Polyfill Reliability:**
- Risk: Polyfill required for `crypto.randomUUID()` in older environments. Polyfill may not match native implementation perfectly.
- Impact: Edge case failures in specific browsers (Safari <15, Firefox <57).
- Migration plan: Use `uuid` library instead of `crypto.randomUUID()`. Test in target browsers before release.

## Missing Critical Features

**No SPARQL Query Execution UI:**
- Problem: `sparql.ts` generates SPARQL CONSTRUCT queries, but no UI to execute them. User can see the query, can't run it.
- Blocks: Phase 5 (SHACL validation) and Phase 6 (transform/fuse) depend on query execution.
- Workaround: Copy-paste query to external SPARQL endpoint (e.g., YASGUI). Not integrated.
- Fix blocks: Needs Comunica integration in Phase 5.

**No Turtle Syntax Validation in Editor:**
- Problem: `TurtleEditorPanel` shows raw Turtle in read-only editor. Invalid syntax not highlighted; parse errors shown in banner only.
- Blocks: Users can't distinguish valid vs. invalid Turtle visually while editing external files.
- Workaround: Use external Turtle validator. Re-paste to test.
- Fix approach: CodeMirror has no built-in Turtle language server. Add basic syntax error underlines with N3 parser feedback.

**No Mapping Transformation Preview:**
- Problem: User creates mapping, sees SPARQL query, but no way to see what the actual transformed data would look like.
- Blocks: Phase 6 (transform/fuse) needs this to validate mappings before applying.
- Workaround: Manually trace through SPARQL mentally or on paper.
- Fix approach: Add "Preview" tab showing transformed triples for first N source instances.

## Test Coverage Gaps

**No E2E Tests for Bidirectional Canvas ↔ Editor Sync:**
- What's not tested: (1) Type in editor → canvas updates (2) Drag node on canvas → editor updates (3) Rapid alternating edits
- Files: `src/hooks/useOntologySync.ts`, `src/components/canvas/OntologyCanvas.tsx`
- Risk: Race condition could be introduced without detection.
- Priority: High — core feature.

**No Tests for JSON Import with Real NATO Data:**
- What's not tested: Large NATO air defense tracks in JSON format. Complex nested structures from Phase 1 example.
- Files: `src/lib/jsonToSchema.ts`
- Risk: Edge cases in real data shapes (arrays of arrays, null fields, unicode names) could crash converter.
- Priority: High — critical for NATO use case.

**No Tests for IDB Restore After Parse Error:**
- What's not tested: Save → introduce parse error in Turtle → refresh → state consistency
- Files: `src/hooks/useAutoSave.ts`
- Risk: Silent data loss if parse error recovery broken.
- Priority: High — affects all persistence.

**No Tests for Handle Mismatch Edge Cases:**
- What's not tested: Property names containing `prop_` or `target_prop_`, unicode in labels, very long labels
- Files: `src/components/nodes/ClassNode.tsx`, `src/components/nodes/SourceNode.tsx`
- Risk: Handle matching could fail silently for certain names.
- Priority: Medium — edge case but affects all connections.

**No Load/Stress Tests:**
- What's not tested: Canvas performance with 100+ nodes, parsing 1MB JSON, 1000+ quads in N3 store
- Files: All libs and components
- Risk: Deployments could encounter performance cliffs unexpectedly.
- Priority: Medium — scales with user base.

---

*Concerns audit: 2026-03-27*
