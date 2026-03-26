# Phase 2 Research: RDF Backbone Libraries

**Researched:** 2026-03-24
**Domain:** CodeMirror 6 Turtle highlighting, N3.js Vite browser build, idb-keyval persistence
**Confidence:** MEDIUM-HIGH (npm registry verified; N3.js browser path needs one integration test)

---

## Q1: CodeMirror 6 — Turtle/RDF Syntax Highlighting

### Verdict: Use `codemirror-lang-turtle` (only option; low-star but functional)

There is exactly one CM6-native Turtle package on npm:

| Package | Version | Peer dep | Status |
|---------|---------|----------|--------|
| `codemirror-lang-turtle` | 0.0.2 | `@codemirror/language ^6` | Published May 2023, no updates since — confidence LOW on future maintenance |
| `@codemirror/lang-turtle` | — | — | Does NOT exist (404 on npm) |

A sibling package by the same author covers SPARQL:

| Package | Version | Status |
|---------|---------|--------|
| `codemirror-lang-sparql` | 2.0.0 | Released Oct 2024, more active |

**Install:**
```bash
npm install codemirror-lang-turtle codemirror-lang-sparql
```

**Usage (React + `@uiw/react-codemirror` or raw CM6):**
```typescript
import { turtle } from 'codemirror-lang-turtle';
import { sparql } from 'codemirror-lang-sparql';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';

const view = new EditorView({
  state: EditorState.create({
    doc: `@prefix ex: <http://example.org/> .\nex:Foo a owl:Class .`,
    extensions: [basicSetup, turtle()],
  }),
  parent: document.getElementById('editor')!,
});
```

**Fallback if `codemirror-lang-turtle` breaks:** Use `@codemirror/legacy-modes` with the bundled
Turtle StreamLanguage mode. That package is officially maintained by the CodeMirror team:

```typescript
import { StreamLanguage } from '@codemirror/language';
import { turtle as turtleMode } from '@codemirror/legacy-modes/mode/turtle';

const turtleExtension = StreamLanguage.define(turtleMode);
```

`@codemirror/legacy-modes` is the safe fallback — official package, actively maintained (v6.x).
It provides less precise highlighting than a Lezer grammar but is zero-risk for compatibility.

**Recommendation:** Start with `codemirror-lang-turtle` (better token granularity). Add
`@codemirror/legacy-modes` as a fallback dep so switching requires one import change.

---

## Q2: N3.js in Vite Browser Build

### Verdict: Requires `vite-plugin-node-polyfills` — not zero-config

N3.js lists two runtime dependencies that are Node built-ins:
```json
{ "buffer": "^6.0.3", "readable-stream": "^4.0.0" }
```

Vite does NOT auto-polyfill these. Without the plugin you will get build errors like
`Buffer is not defined` or `stream is not defined` at runtime.

**Install:**
```bash
npm install n3
npm install --save-dev vite-plugin-node-polyfills
```

**`vite.config.ts` — add the plugin:**
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // Only polyfill what N3.js actually needs
      include: ['buffer', 'stream', 'events'],
      globals: { Buffer: true },
    }),
  ],
  base: './',
  server: { port: 3000 },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
```

**Import pattern — use named exports, not the default object:**
```typescript
import { Parser, Writer, Store, DataFactory } from 'n3';
```

This is the correct ESM path (`"module": "./src/index.js"` in N3's package.json). Do NOT use
`import N3 from 'n3'` — the default export is the legacy CJS shape.

**TypeScript types:** N3.js ships its own `@types` in-package as of v2.x. No `@types/n3` needed.
Types are accurate and cover `Quad`, `NamedNode`, `BlankNode`, `Literal`, `DataFactory`, etc.
One known rough edge: `Store.match()` returns `Quad[]` but the type says `Stream<Quad>` — use
`[...store.match(...)]` or `store.getQuads(...)` to get a plain array with correct inference.

**Confidence:** MEDIUM — polyfill requirement confirmed by N3's own package.json deps and multiple
Vite community reports. One integration smoke test should confirm before shipping.

---

## Q3: idb-keyval Usage Pattern

### Verdict: Zero-config, works in Vite, pure IndexedDB

`idb-keyval` v6 is a pure browser library. No Node polyfills required. It uses IndexedDB
directly, ships as ESM, and Vite handles it with no special config.

**Install:**
```bash
npm install idb-keyval
```

**Auto-save pattern for a single project blob:**
```typescript
import { get, set } from 'idb-keyval';

const PROJECT_KEY = 'rosetta:project';

// Save (call on any state change, debounced)
export async function saveProject(state: ProjectState): Promise<void> {
  await set(PROJECT_KEY, state);
}

// Load on app init
export async function loadProject(): Promise<ProjectState | undefined> {
  return get<ProjectState>(PROJECT_KEY);
}
```

**Debounce wrapper for Zustand auto-save:**
```typescript
import { debounce } from 'lodash-es'; // or a manual impl

const debouncedSave = debounce(saveProject, 500);

// In Zustand store subscribe:
useProjectStore.subscribe((state) => {
  debouncedSave(state);
});
```

Values can be any structured-cloneable type — plain objects, arrays, `ArrayBuffer`. Do NOT
store class instances; they will deserialize as plain objects.

**Confidence:** HIGH — verified against official README and npm package (v6.2.2).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Turtle tokenization | custom regex tokenizer | `codemirror-lang-turtle` (Lezer grammar) |
| CM6 fallback highlighting | custom StreamLanguage | `@codemirror/legacy-modes` turtle mode |
| Browser Buffer shim | manual global inject | `vite-plugin-node-polyfills` |
| IndexedDB wrapper | raw IDBRequest callbacks | `idb-keyval` |

---

## Common Pitfalls

### Pitfall 1: N3.js `Store.match()` type mismatch
`store.match(s, p, o)` TypeScript return type is `Stream<Quad>` but runtime value is array-like.
Use `store.getQuads(s, p, o, null)` for a proper `Quad[]` return.

### Pitfall 2: CodeMirror extensions not memoized in React
If you construct `turtle()` inside a component render function, CM6 rebuilds the parser on every
render. Memoize with `useMemo` or hoist to module scope.

### Pitfall 3: idb-keyval in Vitest
IndexedDB is not available in jsdom. Mock `idb-keyval` in test setup:
```typescript
// vitest.setup.ts
vi.mock('idb-keyval', () => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
}));
```

### Pitfall 4: `vite-plugin-node-polyfills` double-Buffer declaration
If another dep also polyfills Buffer (e.g., a legacy webpack-targeted lib), you may see
`Identifier 'Buffer' has already been declared`. Fix: set `globals: { Buffer: false }` in
the plugin options and rely on the import-based polyfill instead.

---

## Sources

- [codemirror-lang-turtle on npm](https://www.npmjs.com/package/codemirror-lang-turtle) — version/deps (HIGH)
- [aatauil/codemirror-lang-turtle GitHub](https://github.com/aatauil/codemirror-lang-turtle) — usage example (HIGH)
- [aatauil/codemirror-lang-sparql GitHub](https://github.com/aatauil/codemirror-lang-sparql) — version/maintenance (HIGH)
- [codemirror/legacy-modes GitHub](https://github.com/codemirror/legacy-modes) — fallback mode (HIGH)
- [rdfjs/N3.js package.json](https://github.com/rdfjs/N3.js/blob/main/package.json) — buffer/readable-stream deps confirmed (HIGH)
- [jakearchibald/idb-keyval README](https://github.com/jakearchibald/idb-keyval#readme) — API pattern (HIGH)
- [vite-plugin-node-polyfills npm](https://www.npmjs.com/package/vite-plugin-node-polyfills) — v0.25.0, polyfill strategy (MEDIUM)
