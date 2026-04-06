# Coding Conventions

**Analysis Date:** 2026-04-06

## Naming Patterns
**Files:** `camelCase.ts` for utilities/hooks/stores; `PascalCase.tsx` for components
**Components:** PascalCase; always named exports (e.g., `export function SourcePanel`)
**Hooks:** `use` prefix, camelCase (e.g., `useCanvasData`, `useAutoSave`)
**Stores:** `use{Domain}Store` (e.g., `useMappingStore`, `useOntologyStore`)
**Event handler props:** `on` prefix; internal handlers: `handle` prefix
**Types/Interfaces:** PascalCase; prefer `interface` over `type` for object shapes
**Constants:** `SCREAMING_SNAKE_CASE`

## Code Style
**Formatter:** Prettier — `singleQuote: true`, `semi: true`, `trailingComma: "all"`, `printWidth: 80`, `tabWidth: 2`
**Linting:** ESLint via `eslint.config.js`; run with `npm run lint`
**Text size:** Default `text-sm` throughout; shadcn `Button` default `size="sm"`

## Import Organization
**Order:**
1. External packages (`react`, `@xyflow/react`, `n3`, etc.)
2. Internal stores/lib/hooks via `@/` alias
3. Relative imports (`./`, `../`)

**Type imports:** Use `import type {}` for type-only imports
**Path alias:** `@/` maps to `src/`

## Error Handling
**Pattern:** `try/catch` with `console.warn` for recoverable failures (IDB reads, parse errors)
**IDB writes:** Call `setSaveStatus('error')` on failure; never silently discard
**RDF parsing:** Wrap N3.js parse calls; surface parse errors to validation UI

## Async Patterns
- Floating promises prefixed with `void` (e.g., `void loadProject()`)
- `useEffect` async work via IIFE: `useEffect(() => { void (async () => { ... })(); }, [...])`
- Never `await` inside event handlers directly — wrap in async function

## Comments
**Section dividers:** `// ─── Section Name ─────────` (em-dash, padded to ~80 chars)
**When:** Explain why, not what; document non-obvious RDF/SPARQL logic

## Function Design
**Guard clauses:** Return early rather than nesting
**Options objects:** Use for functions with >2 related params
**Return values:** Explicit returns; avoid implicit `undefined`

## Module Design
**Exports:** Named exports throughout; `export default` only in `src/App.tsx` and route-level files
**Stores:** All state actions colocated in the store file; no external mutation

## Canvas Color Semantics (CRITICAL — never break)
- **Amber nodes:** source data nodes
- **Blue nodes:** master ontology nodes
- **Dashed green edges:** mapping edges

## IDB Persistence Pattern
Each store: `useAutoSave` subscribes → snapshots state → restores on mount with type guard → calls `setSaveStatus('error')` on failure. Type guards must validate element shape (e.g., `typeof m.id === 'string'`), not just `Array.isArray`.

---
*Convention analysis: 2026-04-06*
