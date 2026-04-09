# Coding Conventions

**Analysis Date:** 2026-04-09

## Naming Patterns

**Files:** camelCase.ts for utilities/hooks/stores; PascalCase.tsx for components
- `src/lib/rdf.ts`, `src/hooks/useAutoSave.ts`, `src/store/ontologyStore.ts`
- `src/components/panels/MappingPanel.tsx`

**Components:** PascalCase, always named exports
- `export function SourcePanel() { ... }`
- Located in `src/components/{domain}/FileName.tsx`

**Hooks:** `use` prefix, camelCase
- `useAutoSave`, `useOntologySync`, `useCanvasData`

**Stores:** `use{Domain}Store` (Zustand)
- `useOntologyStore`, `useSourcesStore`, `useMappingStore`, `useValidationStore`, `useUiStore`

**Event handler props:** `on` prefix (e.g., `onFnChange`, `onClick`)
**Internal handlers:** `handle` prefix (e.g., `handleBeforeUnload`)

**Types/Interfaces:** PascalCase; prefer `interface` over `type` for object shapes
- `interface OntologyState`, `type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'`

**Constants:** `SCREAMING_SNAKE_CASE`
- `const IDB_KEY = 'rosetta-project'`
- Module-level callbacks stay lowercase: `let invalidateMappingsCallback`

## Code Style

**Formatter:** Prettier — `singleQuote: true`, `semi: true`, `trailingComma: "all"`, `printWidth: 80`, `tabWidth: 2`
- Run: `npm run format` (write), `npm run format:check` (validate)
- Pre-commit hook via lint-staged auto-formats staged files

**Linting:** ESLint via `eslint.config.js`
- Run: `npm run lint`
- Includes react-hooks plugin

**Text size:** Default `text-sm` throughout
**Button size:** shadcn `Button` default `size="sm"`

## Import Organization

**Order:**
1. External packages (`react`, `@xyflow/react`, `n3`, `zustand`, etc.)
2. Internal stores/lib/hooks via `@/` alias
3. Relative imports (`./`, `../`)

**Type imports:** Use `import type {}` for type-only imports
- `import type { OntologyNode } from '@/types/index'`

**Path alias:** `@/` maps to `src/` (configured in vite.config.ts)

## Error Handling

**Pattern:** `try/catch` with `console.warn` for recoverable failures
- IDB reads, parse errors, source restoration
- Example: `useAutoSave.ts` logs "rosetta: restored invalid Turtle from IDB"

**IDB writes:** Always call `setSaveStatus('error')` on failure
- Never silently discard; provide user-facing feedback

**RDF parsing:** Wrap N3.js parse calls; surface errors via `ontologyStore.parseError`

## Async Patterns

**Floating promises:** Prefix with `void`
- `void get<ProjectFile>(IDB_KEY).then(...)`

**useEffect async work:** IIFE pattern
```typescript
useEffect(() => {
  void (async () => {
    const data = await parseTurtle(text);
    // ...
  })();
}, [deps]);
```

**Never `await` inside event handlers directly** — wrap in async function

## Comments

**Section dividers:** `// ─── Section Name ────────────────────────` (em-dash, ~80 chars)
- Used throughout `ontologyStore.ts`, `useAutoSave.ts`, `rdf.test.ts`

**When:** Explain why, not what; document non-obvious RDF/SPARQL logic

## Function Design

**Guard clauses:** Return early rather than nesting
**Options objects:** Use for functions with >2 related params
**Return values:** Explicit returns; avoid implicit `undefined`

## Module Design

**Exports:** Named exports throughout; `export default` only in `src/App.tsx`
- All store actions exported by name; all utility functions exported by name

**Stores:** All state actions colocated in store file; no external mutation
- Store state and actions in `interface OntologyState`, `interface MappingState`, etc.

## Canvas Color Semantics (CRITICAL — never break)

- **Amber nodes:** source data nodes (imported data)
- **Blue nodes:** master ontology nodes (RDF classes)
- **Dashed green edges:** mapping edges (source ↔ ontology)

## IDB Persistence Pattern

Each store: `useAutoSave` subscribes → debounces 500ms → snapshots state → writes to IDB.

**On mount:**
1. Load from IDB with type guards (e.g., `isValidMappings(v)` validates shape, not just `Array.isArray`)
2. Restore with hydration actions (e.g., `useMappingStore.getState().hydrate(mappings, groups)`)
3. Reset related selection state to prevent stale pointers (e.g., `selectedMappingId: null`)
4. If invalid/missing, load seed ontology
5. Set `hydratedRef.current = true` to unblock further saves

**Type guards:** Must validate element shape (e.g., `typeof m.id === 'string'`), not just `Array.isArray`

---
*Convention analysis: 2026-04-09*
