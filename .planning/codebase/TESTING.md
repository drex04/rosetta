# Testing Patterns

**Analysis Date:** 2026-04-09

## Test Framework

**Runner:** Vitest 4.1.2 with jsdom environment
- Config: `vitest.config.ts`
- Setup file: `src/__tests__/setup.ts`
- Coverage provider: `@vitest/coverage-v8`

**E2E:** Playwright 1.58.2
- Config: `playwright.config.ts`
- Fixtures: `e2e/fixtures.ts`
- **CRITICAL:** Use `chromium` browser (not `chrome`) — Linux ARM64 host

**Run Commands:**
```bash
npm run test              # Vitest unit tests (excludes e2e/)
npm run build             # Catch TS errors after changes (LSP lags)
npx playwright test       # E2E tests (requires dev server: npm run dev)
npm run test:ui           # Vitest UI dashboard
```

## Test File Organization

**Unit:** `src/__tests__/*.test.ts` (or `.test.tsx`)
- One file per concern: `store.test.ts`, `rdf.test.ts`, `autoSave.test.ts`, `formulaParser.test.ts`
- Flat directory structure

**E2E:** `e2e/*.spec.ts`
- Feature-scoped files: `mappings.spec.ts`, `persistence.spec.ts`
- Use `freshPage` fixture (defined in `e2e/fixtures.ts`)

**Helpers:** `e2e/helpers.ts` for shared utilities; `e2e/fixtures.ts` for Playwright fixtures

## Test Structure

**Pattern:** `describe('subjectUnderTest — action', () => { it('verb: outcome', ...) })`

Examples:
```typescript
describe('useOntologyStore', () => {
  it('setNodes updates nodes', () => { ... });
  it('loadTurtle sets parseError on invalid Turtle', async () => { ... });
});

describe('localName', () => {
  it('extracts local name after #', () => { ... });
  it('falls back to full URI when no # or / found', () => { ... });
});
```

**Section dividers:** `// ─── Section Name ────────────────────────` (em-dash, ~80 chars)

**Helper factories:** Inline `make*` functions for test data
```typescript
const makeSource = (id: string, name: string): Source => ({
  id, name, order: 0, rawData: '{}', dataFormat: 'json',
  schemaNodes: [], schemaEdges: [], parseError: null,
});
```

## Store Testing

**Reset pattern:** `beforeEach()` resets state to initial values
```typescript
beforeEach(() => {
  useOntologyStore.setState({ nodes: [], edges: [], turtleSource: '' });
  useSourcesStore.setState({ sources: [], activeSourceId: null });
});
```

**Action testing:** Call `getState()` to invoke actions and verify state
```typescript
useOntologyStore.getState().setNodes(nodes);
expect(useOntologyStore.getState().nodes).toEqual(nodes);
```

**Async actions:** Await and verify state change atomically
```typescript
await useOntologyStore.getState().loadTurtle(validTurtle);
expect(useOntologyStore.getState().parseError).toBeNull();
expect(useOntologyStore.getState().nodes.length).toBeGreaterThan(0);
```

## RDF and Round-Trip Testing

**Test N3.js with real RDF data** — do not mock RDF layer in RDF-focused tests
- Use sample Turtle throughout (examples in `rdf.test.ts` lines 62-94)

**Round-trip tests:** Parse → canvasToTurtle → parse → assert structure preserved
```typescript
const first = await parseTurtle(SAMPLE_TURTLE);
const turtle2 = await canvasToTurtle(first.nodes, first.edges);
const second = await parseTurtle(turtle2);
expect(second.nodes).toHaveLength(first.nodes.length);
```

**Edge cases:** Empty input, invalid syntax, OWL Restriction handling (isDT/isOP paths)

## Mocking

**When to mock:**
- `idb-keyval` (get/set) for save logic isolation
- `src/lib/rdf` functions for store business logic isolation

**When NOT to mock:**
- Zustand stores — use `.getState()` and `.setState()` directly
- N3.js in RDF-focused tests — round-trips require real parser
- React hooks in component tests — use `renderHook` from `@testing-library/react`

## E2E Test Patterns

**Fixture: `freshPage`** (defined in `e2e/fixtures.ts`)
- Clears `keyval-store` IDB database
- Clears `rosetta-ui` localStorage
- Navigates to `/`
- Use for all layout/interaction/persistence tests

```typescript
test('mappings persist across reload', async ({ freshPage }) => {
  // Create mapping, reload, assert restored
});
```

**Persistence verification:**
1. Perform action (create mapping)
2. Reload page
3. Assert state restored from IDB

## Coverage

**Target:** 70% lines/functions/statements/branches (enforced in `vitest.config.ts`)

**Focus areas:**
- RDF round-trips (parseTurtle ↔ canvasToTurtle)
- Store action correctness (add/update/delete/idempotency)
- SPARQL CONSTRUCT outputs
- JSON→RDFS conversion
- IDB persistence and hydration

## Critical Rules

1. **Run `npm run build`** (not just `npm run test`) to catch TS errors after changes
2. **E2E via `npx playwright test`** (not `npm run test`) — Vitest picks up `e2e/` but fails without dev server
3. **Use `freshPage` fixture** for all E2E tests touching IDB or localStorage
4. **Playwright: `chromium` only** (not `chrome`) — Linux ARM64 host
5. **Bidirectional sync tests:** Verify `isUpdatingFrom*` guard pattern prevents circular updates
6. **Type guards in IDB tests:** Validate element shape, not just `Array.isArray` (see `useAutoSave.ts` lines 21-57)

---
*Testing analysis: 2026-04-09*
