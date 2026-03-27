# Coding Conventions

**Analysis Date:** 2026-03-27

## Naming Patterns

**Files:**
- React components: PascalCase (e.g., `ClassNode.tsx`, `MappingPanel.tsx`)
- Utility modules: camelCase (e.g., `rdf.ts`, `jsonToSchema.ts`, `sparql.ts`)
- Store modules: camelCase with "Store" suffix (e.g., `ontologyStore.ts`, `sourcesStore.ts`)
- Hook modules: camelCase with "use" prefix (e.g., `useOntologySync.ts`, `useAutoSave.ts`)
- Test files: match implementation name + `.test.ts` or `.spec.ts` suffix (e.g., `rdf.test.ts`)

**Functions:**
- Component functions: PascalCase (e.g., `ClassNode()`, `Header()`)
- Utility/helper functions: camelCase (e.g., `parseTurtle()`, `localName()`, `shortenUri()`)
- Custom hooks: camelCase with `use` prefix (e.g., `useOntologySync()`, `useAutoSave()`)
- Private helpers: camelCase with optional leading underscore (e.g., `firstLiteral()`, `walkObject()`)

**Variables:**
- Constants: SCREAMING_SNAKE_CASE for compile-time constants (e.g., `COLUMN_X_MASTER`, `RDF_TYPE`, `TREE_BASE_Y`)
- State variables: camelCase (e.g., `nodes`, `turtleSource`, `parseError`)
- Boolean flags: camelCase, often prefixed with `is` (e.g., `isUpdatingFromCanvas`, `hasPendingEdits`)

**Types:**
- Interfaces: PascalCase, often suffixed with semantic name (e.g., `ClassData`, `PropertyData`, `ProjectFile`, `WalkContext`)
- Type aliases: PascalCase (e.g., `OntologyNode`, `SourceNode`, `OntologyEdge`)
- Zustand state interfaces: PascalCase with "State" suffix (e.g., `OntologyState`, `SourcesState`)

## Code Style

**Formatting:**
- No explicit formatter configured; ESLint enforces style via recommended config
- Line length: no strict limit visible in config
- Indentation: 2 spaces (inferred from existing code)
- Trailing commas: allowed and used in multiline structures

**Linting:**
- Tool: ESLint 9 with flat config (`eslint.config.js`)
- Config extends: `@eslint/js` recommended, `typescript-eslint` recommended, `react-hooks/flat` recommended, `react-refresh` vite
- Rule enforcement: Unused variables and React hook rules are enforced
- No Prettier explicitly configured; formatting follows ESLint presets

## Import Organization

**Order:**
1. External dependencies (React, third-party libraries)
2. Internal type imports (`import type { ... } from '@/types/...'`)
3. Internal store imports (`import { ... } from '@/store/...'`)
4. Internal utility/lib imports (`import { ... } from '@/lib/...'`)
5. Internal component imports (`import { ... } from '@/components/...'`)
6. Internal hook imports (`import { ... } from '@/hooks/...'`)
7. Data/asset imports (e.g., `import ... from '@/data/...'`)

**Path Aliases:**
- `@/` maps to `src/` (configured in `vitest.config.ts` and used throughout)
- Always use alias imports, never relative paths (e.g., prefer `@/lib/rdf` over `../lib/rdf`)

**Examples:**
```typescript
import * as N3 from 'n3'
import { Handle, Position } from '@xyflow/react'
import type { OntologyNode } from '@/types/index'
import { useOntologyStore } from '@/store/ontologyStore'
import { parseTurtle } from '@/lib/rdf'
import { ClassNode } from '@/components/nodes/ClassNode'
```

## Error Handling

**Patterns:**
- Try-catch blocks used in async flows (e.g., `useOntologySync.ts` lines 47-67)
- Errors captured with `catch (e)` and cast to `Error` type: `(e as Error).message`
- Fallback error messages when error object lacks message: `(e as Error).message ?? 'Invalid Turtle syntax'`
- Error state stored in Zustand stores (e.g., `parseError: string | null` in `ontologyStore`)
- On parse failure, canvas state left unchanged; error displayed to user via banner

**Example:**
```typescript
try {
  const { nodes, edges } = await parseTurtle(newTurtle)
  isUpdatingFromEditor.current = true
  // ... update store
  useOntologyStore.getState().setParseError(null)
} catch (e) {
  useOntologyStore.getState().setParseError((e as Error).message ?? 'Invalid Turtle syntax')
} finally {
  isUpdatingFromEditor.current = false
}
```

## Logging

**Framework:** `console` (no external logging library used)

**Patterns:**
- No explicit logging observed in source code
- Errors logged implicitly via error state and UI banners
- No structured logging; debugging relies on browser console and React DevTools

## Comments

**When to Comment:**
- Section headers: Use `// ─── Name ────...` format (dashes for visual separation)
- Function behavior: Document via JSDoc for exported utilities
- Complex logic: Inline comments for non-obvious branching or state management
- RD notes: References to design documents (e.g., `// (D-05)`, `// (RD-02)`) indicate design decision linkage

**JSDoc/TSDoc:**
- Used sparingly for public utility functions (e.g., `localName()` in `rdf.ts` lines 26-30)
- Describes purpose and side effects
- Parameter types inferred from TypeScript signatures; not repeated in JSDoc

**Example:**
```typescript
// ─── localName ────────────────────────────────────────────────────────────────

/**
 * Extracts the local name from a URI — the fragment after `#`,
 * or the last path segment after `/`. Falls back to the full URI
 * if neither delimiter is found after a meaningful character.
 */
export function localName(uri: string): string {
```

## Function Design

**Size:** Functions are concise and single-purpose. Utility functions 20-50 lines; components 50-100 lines with JSX.

**Parameters:**
- Prefer object parameters for multiple related arguments (e.g., `WalkContext` in `jsonToSchema.ts`)
- React hooks destructure from hooks directly rather than accept parameters
- Callbacks passed as parameters to event handlers

**Return Values:**
- Async functions return `Promise<T>`
- Parse functions return `{ nodes: T[]; edges: T[] }` (tuple-like structures)
- Schema functions return interfaces with multiple fields (e.g., `SchemaResult` with `nodes`, `edges`, `turtle`, `warnings`)
- Store actions return `void` or `Promise<void>` (mutations happen via `set()` call)

**Example:**
```typescript
export async function parseTurtle(
  text: string,
): Promise<{ nodes: OntologyNode[]; edges: OntologyEdge[] }> {
  // ...
  return { nodes, edges }
}
```

## Module Design

**Exports:**
- Utility modules export named functions and interfaces (no default exports)
- Components export named function components (no default exports)
- Stores export Zustand hook via `export const useStoreName = create<State>(...)`
- Constants and helper types exported selectively (public interface at module level)

**Barrel Files:**
- `src/types/index.ts` aggregates type exports
- No barrel file for components (imports are direct from subpaths)
- Store imports are direct (e.g., `@/store/ontologyStore` not `@/store`)

**Example:**
```typescript
// src/store/ontologyStore.ts
export const useOntologyStore = create<OntologyState>((set) => ({ ... }))
export const SEED_TURTLE = '...'

// src/lib/rdf.ts
export function localName(uri: string): string { ... }
export function parseTurtle(text: string): Promise<{ ... }> { ... }
export const COLUMN_X_MASTER = 0
```

## Zustand Store Pattern

**State definition:** Interface with state properties and action methods
**Creation:** `create<State>((set) => ({ ... }))`
**Selectors:** Components use selector syntax: `useStore((s) => s.property)`
**Actions:** Called via `useStore.getState().actionName()`
**Subscription:** Used in `useEffect` for side effects (e.g., `useAutoSave` hook)

**Example:**
```typescript
interface OntologyState {
  nodes: OntologyNode[]
  setNodes: (nodes: OntologyNode[]) => void
  loadTurtle: (text: string) => Promise<void>
}

export const useOntologyStore = create<OntologyState>((set) => ({
  nodes: [],
  setNodes: (nodes) => set({ nodes }),
  loadTurtle: async (text) => {
    const { nodes, edges } = await parseTurtle(text)
    set({ nodes, edges })
  },
}))

// Usage
const nodes = useOntologyStore((s) => s.nodes)
await useOntologyStore.getState().loadTurtle(turtle)
```

## Bidirectional Sync Pattern

**Pattern:** Use `isUpdatingFrom*` refs to prevent circular updates
**Implementation:** Files `useOntologySync.ts` (lines 16-70)
- `isUpdatingFromCanvas`: Set while canvas→editor path runs; editor handler skips parse when true
- `isUpdatingFromEditor`: Set while editor→canvas path runs; canvas handler is no-op when true
- Debounce timer managed with `useRef<ReturnType<typeof setTimeout> | null>`
- Cleanup on unmount clears pending timers

**Pattern guarantees:** Single source of truth; no infinite loops; both directions stay in sync

## React/TypeScript Conventions

**Component structure:**
- Destructure props inline: `({ data }: NodeProps<OntologyNode>)`
- Props typed via library exports (e.g., `NodeProps<T>` from `@xyflow/react`)
- Avoid prop spreading; be explicit about passed props

**Hooks usage:**
- `useRef` for mutable state that doesn't trigger re-renders (timers, flags)
- `useState` for UI state (file input, error messages)
- Zustand hooks for global domain state (ontology, sources, mappings)
- Custom hooks for complex logic (sync, auto-save)

**Type safety:**
- All function parameters and return types fully typed
- Use `as const` for literal types (e.g., `type: 'classNode' as const`)
- Type guards for runtime validation (e.g., `typeof v['version'] !== 1` in `isValidProjectFile`)

---

*Convention analysis: 2026-03-27*
