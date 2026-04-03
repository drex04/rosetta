# Phase 13: RML Native Transform - Research

**Researched:** 2026-04-03
**Domain:** @comake/rmlmapper-js — browser-compatible RML mapping engine
**Confidence:** MEDIUM (API shape verified via multiple sources; bundle/Vite behavior inferred from library ancestry + ecosystem evidence)

---

## Summary

`@comake/rmlmapper-js` (v0.5.x) is a browser-compatible fork of RocketRML. The primary motivation for the fork was the **explicit removal of Node.js native modules** (`fs`, `path`, `stream`) so the library can run in a browser without polyfills. It accepts RML mapping rules as a Turtle string and source data as an in-memory `{ [filename: string]: string }` map, then returns either a JSON-LD array (default) or an N-Quads string (`toRDF: true`).

Rosetta already generates valid RML Turtle in `src/lib/rml.ts`. The integration path is therefore: call `parseTurtle(turtleString, inputFiles, { toRDF: true })`, receive an N-Quads string, parse it into an `N3.Store` with `N3.Parser`, and discard the Comunica SPARQL CONSTRUCT path entirely.

**Primary recommendation:** Use `parseTurtle(..., { toRDF: true })`, parse the N-Quads result with N3.js, and feed into the existing store/display pipeline.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @comake/rmlmapper-js | 0.5.2 | Execute RML mapping rules in-browser | Only browser-safe pure-JS RML engine; explicit goal is no Node deps |
| N3.js | already installed | Parse N-Quads output into N3.Store | Already in Rosetta; N-Quads is the bridge format |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @comake/rmlmapper-js | rocketrml | rocketrml uses `fs`/`path` — Node-only, won't bundle for browser |
| @comake/rmlmapper-js | @rmlio/rmlmapper-java-wrapper | Requires Java subprocess — not browser-compatible |
| N-Quads output (toRDF:true) | JSON-LD output (default) | JSON-LD needs extra jsonld.js expand/parse step; N-Quads is simpler with N3.Parser already in use |

**Installation:**
```bash
npm install @comake/rmlmapper-js
```

---

## Architecture Patterns

### Recommended Project Structure

No new directories needed. Integration lives in one new file:

```
src/lib/
  rml.ts          # existing — generates RML Turtle string (keep as-is)
  rmlExecute.ts   # NEW — wraps parseTurtle, returns N3.Store
```

### Pattern 1: Call Site in rmlExecute.ts

**What:** Thin async wrapper around `parseTurtle` that returns an `N3.Store`.
**When to use:** Called from the transform/fuse layer wherever Comunica CONSTRUCT currently executes.

```typescript
// Source: https://github.com/comake/rmlmapper-js README + npm docs
import { parseTurtle } from '@comake/rmlmapper-js';
import { Parser as N3Parser, Store as N3Store } from 'n3';

/**
 * Execute an RML mapping in-browser.
 *
 * @param turtleMapping  - RML rules as Turtle string (from src/lib/rml.ts generateRml())
 * @param sources        - Map of logical-source filename → raw content string
 *                         Keys must match the rml:source value in the Turtle, e.g.
 *                         { "source.json": "[{...}]" }
 * @returns              Populated N3.Store containing the mapped RDF
 */
export async function executeRml(
  turtleMapping: string,
  sources: Record<string, string>,
): Promise<N3Store> {
  // toRDF:true → N-Quads string output (not JSON-LD)
  const nquads = await parseTurtle(turtleMapping, sources, { toRDF: true }) as string;

  const store = new N3Store();
  const parser = new N3Parser({ format: 'N-Quads' });
  const quads = parser.parse(nquads);
  store.addQuads(quads);
  return store;
}
```

### Pattern 2: Constructing the inputFiles Map

The `inputFiles` keys must match exactly the `rml:source` literal values in your RML Turtle. In Rosetta's `generateRml()`, each logical source uses a filename derived from the source name:

```typescript
// Align with whatever rml:source value generateRml() emits, e.g. "nato-air.json"
const inputFiles: Record<string, string> = {};
for (const source of activeSources) {
  const filename = `${source.name}.json`;   // must match rml:source in Turtle
  inputFiles[filename] = source.rawContent; // raw JSON string
}
const store = await executeRml(rmlTurtle, inputFiles);
```

### Pattern 3: Multiple Sources

The library handles multiple logical sources automatically — each `rr:TriplesMap` in the Turtle references its own `rml:LogicalSource`, which references its own `rml:source` filename. Pass all source files in the same `inputFiles` object; the mapper routes each TriplesMap to its own source key.

```typescript
// Two sources, two keys — mapper selects correct one per TriplesMap
const inputFiles = {
  'aircraft.json': aircraftJson,
  'units.json':    unitsJson,
};
```

### Anti-Patterns to Avoid

- **Passing file system paths as values:** The library no longer reads files from disk. Values must be the raw file content as a string, not a path like `"/data/file.json"`.
- **Relying on JSON-LD default output with N3.js:** Default output (no `toRDF`) is a JSON-LD JavaScript object array. N3.Parser cannot consume it directly — always pass `{ toRDF: true }` to get N-Quads.
- **Sharing logical source filenames across sources:** Each `rml:source` value must be unique and match exactly one key in `inputFiles`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSONPath iteration over source data | Custom iterator | rmlmapper-js built-in | Edge cases in `$[*]`, nested paths, `$.key[*]` |
| RML rule parsing | Custom Turtle→mapping parser | rmlmapper-js built-in | rml:LogicalSource, rr:TriplesMap, rr:PredicateObjectMap graph traversal is complex |
| N-Quads → N3.Store | Custom quad builder | `new N3Parser({ format: 'N-Quads' }).parse(nquads)` | Already available; 2 lines |

---

## Common Pitfalls

### Pitfall 1: rml:source filename mismatch

**What goes wrong:** `parseTurtle` silently produces zero triples.
**Why it happens:** The `rml:source` value in the Turtle (e.g., `"source.json"`) does not exactly match a key in `inputFiles`.
**How to avoid:** Make `generateRml()` and `executeRml()` share a single `sourceFilename(source)` helper function that both call. Never compute the filename in two places.
**Warning signs:** Empty N3.Store after a call that should produce quads; no thrown error.

### Pitfall 2: Vite/esbuild Node built-in residue

**What goes wrong:** Vite build fails with `"fs" is not exported by __vite-browser-external`.
**Why it happens:** Despite the fork's intent, transitive dependencies of rmlmapper-js (e.g., jsonld, N3 internals) may reference Node globals.
**How to avoid:** Add to `vite.config.ts`:
```typescript
resolve: {
  alias: {
    // Only add if build errors appear — prefer not adding unnecessary polyfills
  }
},
optimizeDeps: {
  include: ['@comake/rmlmapper-js'],
},
```
If Buffer errors appear at runtime, install `vite-plugin-node-polyfills` and enable `globals: { Buffer: true }` only.
**Warning signs:** Build-time error mentioning `fs`, `path`, `stream`, or `Buffer is not defined` at runtime.

### Pitfall 3: Async not awaited / unhandled rejection

**What goes wrong:** Store appears empty; no error visible in UI.
**Why it happens:** `parseTurtle` returns a Promise; if the call site forgets `await`, the store is populated after render.
**How to avoid:** Always `await executeRml(...)`. The wrapper function must be `async`.

### Pitfall 4: Large source data blocks the main thread

**What goes wrong:** UI freezes for several seconds during mapping.
**Why it happens:** `parseTurtle` is CPU-bound for large datasets; it runs synchronously inside the Promise on the main thread.
**How to avoid:** For datasets > ~500 KB, wrap `executeRml` in a Web Worker. For the current NATO demo data (small JSON files), main-thread execution is acceptable. Do not pre-optimize.

### Pitfall 5: Library is not actively maintained (last published 2+ years ago)

**What goes wrong:** Bug in RML feature (JOINs, named graphs, non-JSON input) has no upstream fix.
**Why it happens:** Package last published ~2022-2023; repo shows limited recent activity.
**How to avoid:** Scope Phase 13 to JSON sources only (which Rosetta already targets). Do not rely on XML support or rr:joinCondition unless tested. If a blocking bug is found, fork and patch — the library is a fork itself and the code is straightforward.

---

## Code Examples

### Minimal verified call pattern

```typescript
// Source: https://www.npmjs.com/package/@comake/rmlmapper-js + GitHub README
import { parseTurtle } from '@comake/rmlmapper-js';

const result = await parseTurtle(
  turtleMappingString,          // string: full RML Turtle document
  { 'data.json': jsonString },  // Record<filename, content>
  { toRDF: true }               // options: toRDF=true → N-Quads string output
);
// result is a string of N-Quads when toRDF:true
```

### N-Quads → N3.Store (already in Rosetta)

```typescript
import { Parser as N3Parser, Store as N3Store } from 'n3';

const store = new N3Store();
store.addQuads(new N3Parser({ format: 'N-Quads' }).parse(result as string));
```

### ParseOptions interface (from npm docs)

```typescript
interface ParseOptions {
  toRDF?: boolean;    // true → N-Quads string; false/omit → JSON-LD array
  compact?: object;   // JSON-LD context for compaction (only when toRDF:false)
  replace?: boolean;  // Replace @id refs with nested objects (JSON-LD only)
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| rocketrml (Node.js fs/path) | @comake/rmlmapper-js (browser-safe fork) | 2021-2022 | Can run in Vite/browser without Node polyfills |
| Comunica SPARQL CONSTRUCT over N3.Store | Direct RML execution via parseTurtle | Phase 13 | Eliminates SPARQL query authoring; mapping rules are first-class RML |

**Deprecated/outdated:**
- `rocketrml` npm package: Node-only, do not use for browser targets.
- `@rmlio/rmlmapper-java-wrapper-js`: Requires Java — not applicable.

---

## Open Questions

1. **Does generateRml() emit rml:source filenames consistently?**
   - What we know: `src/lib/rml.ts` exists and generates RML Turtle from the mapping store.
   - What's unclear: The exact string used as `rml:source` value — whether it's `source.name`, `source.name + ".json"`, or a URI.
   - Recommendation: Read `generateRml()` output during Wave 0 and pin the filename derivation as a shared constant before writing tests.

2. **Bundle size impact**
   - What we know: @comake/rmlmapper-js bundles jsonld and N3 as dependencies, which Rosetta already has. Actual added bundle size is unknown without a build test.
   - What's unclear: Whether jsonld bundled inside rmlmapper-js deduplicates with Rosetta's top-level jsonld dependency.
   - Recommendation: Run `npm run build` and check chunk sizes after installation. If > 200 KB added, investigate `optimizeDeps.exclude` + dynamic import.

3. **XML source support needed?**
   - What we know: Rosetta currently imports JSON only.
   - What's unclear: Whether Phase 13 scope includes XML.
   - Recommendation: Treat as out of scope; the library supports XML but it is not tested here.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest |
| Config file | `vite.config.ts` (vitest block) |
| Quick run command | `npm run test` |
| Full suite command | `npm run build && npm run test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RML-01 | parseTurtle returns N-Quads for a minimal mapping + JSON source | unit | `npm run test -- rmlExecute` | Wave 0 |
| RML-02 | Multiple sources routed to correct TriplesMap | unit | `npm run test -- rmlExecute` | Wave 0 |
| RML-03 | Filename mismatch → empty store, no throw | unit | `npm run test -- rmlExecute` | Wave 0 |
| RML-04 | N-Quads string parsed into N3.Store with correct quad count | unit | `npm run test -- rmlExecute` | Wave 0 |

### Wave 0 Gaps

- [ ] `src/__tests__/rmlExecute.test.ts` — covers RML-01 through RML-04
- [ ] Fixture: minimal valid RML Turtle string + matching JSON source string

---

## Recommended Integration Approach

**Step 1 — Install**
```bash
npm install @comake/rmlmapper-js
```

**Step 2 — Create `src/lib/rmlExecute.ts`** with the `executeRml(turtle, sources)` wrapper shown above.

**Step 3 — Shared filename helper** — extract source filename derivation from `generateRml()` into a named export:
```typescript
// src/lib/rml.ts
export function rmlSourceFilename(source: Source): string {
  return `${source.name}.json`;
}
```
Import and use in both `generateRml()` and the `executeRml` call site.

**Step 4 — Replace Comunica call** — in the transform/fuse layer, replace:
```typescript
// OLD: Comunica SPARQL CONSTRUCT
const bindingsStream = await engine.queryQuads(constructQuery, { sources: [store] });
```
with:
```typescript
// NEW: RML direct execution
import { executeRml } from '@/lib/rmlExecute';
import { generateRml } from '@/lib/rml';

const rmlTurtle = generateRml(mappings, sources);
const inputFiles = Object.fromEntries(
  sources.map(s => [rmlSourceFilename(s), s.rawContent])
);
const outputStore = await executeRml(rmlTurtle, inputFiles);
```

**Step 5 — Build test** — run `npm run build` to surface any Vite/Node polyfill issues before writing tests.

---

## Sources

### Primary (HIGH confidence)
- [GitHub: comake/rmlmapper-js](https://github.com/comake/rmlmapper-js) — README API docs, fork rationale
- [npm: @comake/rmlmapper-js](https://www.npmjs.com/package/@comake/rmlmapper-js) — ParseOptions interface, version 0.5.2, toRDF behavior

### Secondary (MEDIUM confidence)
- [npm: rocketrml](https://www.npmjs.com/package/rocketrml) — RocketRML ancestry; confirmed Node-only
- [RocketRML paper (CEUR-WS)](https://ceur-ws.org/Vol-2489/paper5.pdf) — confirmed JSONPath iterator, JSON/XML support scope
- [vite-plugin-node-polyfills](https://github.com/davidmyersdev/vite-plugin-node-polyfills) — Vite polyfill pattern if needed

### Tertiary (LOW confidence)
- WebSearch synthesis re: bundle deduplication behavior — not verified against an actual build

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — npm docs confirm API, version, and browser-safe fork goal
- Architecture: MEDIUM — call pattern derived from README + rocketrml API (same shape); not tested against a live Vite build
- Pitfalls: MEDIUM — Vite/Node-polyfill risk inferred from ecosystem; filename mismatch pitfall is structural/logical

**Research date:** 2026-04-03
**Valid until:** 2026-07-03 (stable library, low churn; last release was 2+ years ago)
