# Testing Patterns

**Analysis Date:** 2026-04-06

## Test Framework
**Runner:** Vitest with jsdom environment; config at `vitest.config.ts`
**Setup file:** `src/__tests__/setup.ts`
**E2E:** Playwright; config at `playwright.config.ts`

**Run Commands:**
- `npm run test` — unit tests (Vitest, excludes `e2e/`)
- `npm run build` — catches TypeScript errors (run after changes, LSP lags)
- `npx playwright test` — E2E tests (requires dev server running)

## Test File Organization
**Unit:** `src/__tests__/*.test.ts` (or `.test.tsx`) — flat directory, one file per concern
**E2E:** `e2e/*.spec.ts` — feature-scoped files (e.g., `mappings.spec.ts`, `persistence.spec.ts`)
**Helpers:** `e2e/helpers.ts` for shared E2E utilities; `e2e/fixtures.ts` for custom fixtures

## Test Structure
**Pattern:** `describe('useStore — actionName', () => { it('verb: expected outcome', ...) })`
**Section dividers:** Same `// ─── Section Name ───` style as source files
**Helper factories:** Inline `make*` functions (e.g., `makeBase(overrides?)`) for test data construction with `Partial<Omit<T, 'id'>>` overrides pattern

## Fixtures
**`freshPage`** (E2E): Defined in `e2e/fixtures.ts`; navigates to `/`, deletes `keyval-store` IDB database, clears `rosetta-ui` from localStorage, reloads. Use for all layout/interaction/persistence E2E tests.
**Store reset** (unit): Call `useStore.setState({...initialState})` in `beforeEach` to isolate tests.

## Mocking
**Framework:** Vitest `vi.mock()` / `vi.fn()` / `vi.mocked()`
**Mock:** `idb-keyval` (get/set), `src/lib/rdf` (parseTurtle, canvasToTurtle) for store unit tests
**Don't mock:** Zustand stores themselves — call `.getState()` directly and reset via `.setState()`
**RDF logic:** Test N3.js round-trips with real N3 — do not mock the RDF layer in RDF-focused tests

## Coverage
**Requirements:** None enforced. Focus on RDF round-trips, store action correctness, and SPARQL CONSTRUCT outputs.

## Test Types
**Unit (`src/__tests__/`):** Store actions (add/update/delete/idempotency), RDF parse/serialize round-trips, JSON→RDFS conversion, hook logic via `renderHook`
**E2E (`e2e/`):** Full user flows — canvas interaction, panel sync, persistence across reload, SHACL validation, mapping creation

## Critical Rules
- Run `npm run build` (not just `npm run test`) to catch TS errors after file changes
- Do NOT run E2E via `npm run test` — Vitest picks them up but fails without a dev server
- E2E tests must use the `freshPage` fixture to ensure clean IDB state
- Playwright must use `chromium` browser (not `chrome`) — Linux ARM64 host, Chrome unavailable
- Verify bidirectional sync tests use the `isUpdatingFrom*` guard pattern to avoid false failures from circular updates

---
*Testing analysis: 2026-04-06*
