# Testing Patterns

**Analysis Date:** 2026-03-27

## Test Framework

**Runner:**
- Vitest 4.1.1
- Config: `vitest.config.ts`
- Environment: jsdom
- Setup file: `src/__tests__/setup.ts`

**Assertion Library:**
- Vitest built-in `expect` (compatible with Jest)
- Testing Library for React hooks (`@testing-library/react`)
- Playwright for E2E tests (`@playwright/test`)

**Run Commands:**
```bash
npm run test           # Run all unit/hook tests (vitest run)
npm run test:ui       # Vitest UI dashboard
npm run test:e2e      # Playwright E2E tests (requires dev server)
```

## Test File Organization

**Location:**
- Unit tests: `src/__tests__/` (co-located with source, same directory tree level)
- E2E tests: `e2e/` (top-level directory)

**Naming:**
- Unit: `*.test.ts` or `*.test.tsx` (e.g., `rdf.test.ts`, `sparql.test.ts`)
- E2E: `*.spec.ts` (e.g., `ontology.spec.ts`, `canvas.spec.ts`)

**Structure:**
```
src/
  __tests__/
    setup.ts              # Global test setup (ResizeObserver, IndexedDB stubs)
    rdf.test.ts           # Tests for src/lib/rdf.ts
    sparql.test.ts        # Tests for src/lib/sparql.ts
    jsonToSchema.test.ts  # Tests for src/lib/jsonToSchema.ts
    store.test.ts         # Tests for Zustand stores
    autoSave.test.ts      # Tests for useAutoSave hook
    useOntologySync.test.ts # Tests for useOntologySync hook
    mappingStore.test.ts   # Tests for mapping store
    useCanvasData.test.ts  # Tests for useCanvasData hook
    smoke.test.tsx        # Basic component smoke test

e2e/
  fixtures.ts            # Custom Playwright test fixtures
  helpers.ts             # Helper functions for E2E tests
  ontology.spec.ts       # Ontology tab tests
  canvas.spec.ts         # Canvas interaction tests
  sources.spec.ts        # Source panel tests
  mappings.spec.ts       # Mapping tests
  ... other spec files
```

## Test Structure

**Suite Organization:**

```typescript
import { describe, it, expect } from 'vitest'
import { localName } from '@/lib/rdf'

// ─── localName ────────────────────────────────────────────────────────────────

describe('localName', () => {
  it('extracts local name after #', () => {
    expect(localName('http://example.com/onto#Aircraft')).toBe('Aircraft')
  })

  it('extracts local name after last /', () => {
    expect(localName('http://example.com/onto/Aircraft')).toBe('Aircraft')
  })
})
```

**Patterns:**
- Section headers using `// ─── Name ────...` format before `describe` blocks
- One assertion per test case (focused testing)
- Descriptive test names in past tense: "extracts...", "parses...", "creates...", "emits...", "returns..."
- Group related tests in single `describe` block
- No nested `describe` blocks; flat structure preferred

**Setup/Teardown:**

```typescript
import { beforeEach, afterEach } from 'vitest'

beforeEach(() => {
  vi.useFakeTimers()
  useOntologyStore.setState({ nodes: [], edges: [], turtleSource: '' })
  mockGet.mockReset()
})

afterEach(() => {
  vi.useRealTimers()
})
```

- Store reset before each test via `setState()`
- Mock reset via `.mockReset()`
- Timers toggled for async tests (fake for control, real for cleanup)

## Mocking

**Framework:** Vitest's `vi` object

**Patterns:**

```typescript
vi.mock('idb-keyval', () => ({
  get: vi.fn(),
  set: vi.fn(),
}))

import { get, set } from 'idb-keyval'
const mockGet = vi.mocked(get)
const mockSet = vi.mocked(set)

// In test
mockGet.mockResolvedValue(undefined)
mockSet.mockResolvedValue(undefined)
```

**What to Mock:**
- External storage (IndexedDB via `idb-keyval`)
- External parsing libraries (N3 parser when testing orchestration)
- File I/O operations
- Async dependencies in unit tests

**What NOT to Mock:**
- RDF parsing logic (test actual N3.js behavior)
- Store state mutations (test actual Zustand behavior)
- Data transformation functions (test actual algorithms)
- E2E flows (use actual app)

**IDB Stub in Setup:**
`src/__tests__/setup.ts` provides a minimal IndexedDB stub so `idb-keyval` doesn't throw during jsdom tests. Allows tests to run without mocking every IDB operation.

## Fixtures and Factories

**Test Data:**

```typescript
const SAMPLE_TURTLE = `
@prefix rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix owl:  <http://www.w3.org/2002/07/owl#> .
@prefix ex:   <http://example.com/onto#> .

ex:Aircraft a owl:Class ;
  rdfs:label "Aircraft" ;
  rdfs:comment "A flying vehicle" .
`

const baseMapping = {
  sourceId: 'src-1',
  sourceClassUri: 'http://example.org/source#Track',
  sourcePropUri: 'http://example.org/source#trackId',
  // ... other fields
}

const VALID_PROJECT_FILE: ProjectFile = {
  version: 1,
  ontology: { turtleSource: MOCK_TURTLE, nodePositions: {} },
  sources: [],
  mappings: {},
  timestamp: '2026-01-01T00:00:00.000Z',
}
```

**Location:**
- Fixtures defined at top of test file (lines 4-51 in `sparql.test.ts`)
- Reusable across multiple `describe` blocks within same file
- Constants named `SAMPLE_*`, `MOCK_*`, `VALID_*` for clarity

**Factory pattern:**
Object spread to create variants:
```typescript
const mapping = { ...baseMapping, sourceClassUri: 'http://example.org/slash/Track' }
```

## Coverage

**Requirements:** No explicit target enforced via CI/config

**View Coverage:**
```bash
npx vitest run --coverage
```

**Current status:**
- Unit tests cover: RDF parsing, SPARQL generation, JSON→schema conversion, stores, hooks
- Notable gaps: Component rendering (smoke test only), E2E flows (Playwright)

## Test Types

**Unit Tests (in `src/__tests__/`):**
- Scope: Individual functions, utilities, store logic
- Approach: Synchronous assertions on inputs/outputs; mock external dependencies
- Examples: `rdf.test.ts` (localName, parseTurtle, round-trips), `sparql.test.ts` (SPARQL CONSTRUCT generation), `store.test.ts` (Zustand state)

**Hook Tests (in `src/__tests__/`):**
- Scope: Custom hooks and their side effects
- Approach: `renderHook` from Testing Library; trigger via `act()`; check store state updates
- Examples: `useAutoSave.test.ts` (IDB persistence), `useOntologySync.test.ts` (bidirectional sync), `useCanvasData.test.ts` (canvas merging)

**E2E Tests (in `e2e/`):**
- Scope: User workflows across UI; canvas interactions; persistence
- Approach: Playwright with custom fixtures; real browser; real IndexedDB
- Examples: `ontology.spec.ts` (edit Turtle, see canvas update), `canvas.spec.ts` (drag nodes, verify serialization), `sources.spec.ts` (add/remove sources)
- Prerequisite: `npm run dev` running on localhost:3000

## Common Patterns

**Async Testing with Vitest:**

```typescript
it('auto-save: writes to IDB after 500ms debounce when store changes', async () => {
  mockGet.mockResolvedValue(undefined)
  mockSet.mockResolvedValue(undefined)

  const { useAutoSave } = await import('../hooks/useAutoSave')
  renderHook(() => useAutoSave())

  act(() => {
    useOntologyStore.getState().setTurtleSource(MOCK_TURTLE)
  })

  vi.advanceTimersByTime(500)

  await vi.waitFor(() => {
    expect(mockSet).toHaveBeenCalled()
  })
})
```

- Import hooks inside test to ensure clean module state
- Use `act()` for state mutations
- Use `vi.advanceTimersByTime()` to skip debounce delays (requires `vi.useFakeTimers()`)
- Use `vi.waitFor()` for assertions on async side effects

**Error Testing:**

```typescript
it('rejects / throws on invalid Turtle syntax', async () => {
  await expect(parseTurtle('this is not valid turtle !!!')).rejects.toThrow()
})
```

- Use `rejects.toThrow()` for async function error paths
- Catch errors in try-catch and assert message: `(e as Error).message ?? 'fallback'`

**Round-trip Testing:**

```typescript
it('preserves same number of nodes and edges after round-trip', async () => {
  const first = await parseTurtle(SAMPLE_TURTLE)
  const turtle2 = await canvasToTurtle(first.nodes, first.edges)
  const second = await parseTurtle(turtle2)
  expect(second.nodes).toHaveLength(first.nodes.length)
  expect(second.edges).toHaveLength(first.edges.length)
})
```

- Parse → serialize → parse again
- Verify structure is preserved (counts, labels, URIs)
- Common in RDF/semantic web testing; validates bidirectional sync correctness

**Playwright E2E Fixture Pattern:**

```typescript
// e2e/fixtures.ts
export const test = base.extend<{ freshPage: Page }>({
  freshPage: async ({ page }, use) => {
    await page.goto('/')
    await page.evaluate(() => {
      indexedDB.deleteDatabase('keyval-store')
      localStorage.removeItem('rosetta-ui')
    })
    await page.reload({ waitUntil: 'networkidle' })
    await use(page)
  },
})

// e2e/ontology.spec.ts
test('14 - Valid Turtle edit updates canvas', async ({ freshPage: page }) => {
  // page is already fresh with IDB/localStorage cleared
})
```

- `freshPage` fixture wipes IndexedDB and localStorage before test
- Ensures each test starts with clean state
- Used in all layout/interaction E2E tests

**E2E Helper Functions:**

```typescript
export async function loadExampleProject(page: Page): Promise<void> {
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Project menu' }).click()
  await page.getByRole('menuitem', { name: 'Example Project' }).click()
  await page.locator('.react-flow__node').first().waitFor({ state: 'visible', timeout: 10000 })
}

export async function fillCodeMirror(page: Page, ariaLabel: string, content: string): Promise<void> {
  const container = page.locator(`[aria-label="${ariaLabel}"]`)
  await container.click()
  await page.keyboard.press('Control+a')
  await page.keyboard.type(content)
}
```

- Encapsulate common workflows (load project, fill editor, add source, click tab)
- Use accessibility queries (role, name) for robustness
- Wait for elements explicitly before action
- Located in `e2e/helpers.ts`

## Playwright Configuration

**Config file:** `playwright.config.ts`

**Key settings:**
- Base URL: `http://localhost:3000`
- Screenshot: `only-on-failure`
- Trace: `retain-on-failure`
- Browser: Chromium only
- Web server: auto-starts `npm run dev` on first run; reuses if already running
- Reporter: HTML (view at `playwright-report/index.html`)

**Run E2E tests:**
```bash
npm run test:e2e
# Reports to playwright-report/ after run
npx playwright show-report  # View HTML report
```

## Known Test Limitations

**Unit Test Gaps:**
- Component rendering not tested (only smoke test exists)
- Canvas interaction logic (`@xyflow/react` handles internally)
- UI state management (`useOntologySync` hooks tested, but not visual feedback)

**E2E Dependencies:**
- Must run `npm run dev` first (or Playwright will start it)
- E2E tests NOT included in `npm run test` (Vitest would try to run them and fail)
- Run separately: `npm run test:e2e` or `npx playwright test`

**IDB Mocking:**
- Unit tests use stub; full IDB not available in jsdom
- E2E tests use real IDB (in real browser)
- If testing store persistence logic in unit tests, mock `idb-keyval` directly

---

*Testing analysis: 2026-03-27*
