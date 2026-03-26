# Plan: Persist Invalid Turtle & Show Validation Errors

## Context

When a user types invalid Turtle in the editor and autosave fires, the raw `turtleSource` string is correctly written to IndexedDB. However, on reload, `useAutoSave.ts` calls `parseTurtle()` on the saved string — which **rejects** — and the `.catch()` block silently logs a warning without calling `setTurtleSource()`. So the store remains in its initial (seeded) state, and the user's work is silently discarded.

Additionally, parse errors are silently swallowed with no UI feedback anywhere in the current code. The user has no way to know *why* the canvas stopped updating.

**Goal:** (1) restore invalid Turtle text after reload, and (2) surface N3.js parse errors in the editor UI. N3.js (already a dependency) produces error messages with line/position info — no new packages needed.

---

## Implementation Plan

### Step 1 — Add `parseError` to `ontologyStore`

**File:** `src/store/ontologyStore.ts`

- Add `parseError: string | null` to the `OntologyState` interface (initial value `null`)
- Add `setParseError: (error: string | null) => void` action

```ts
parseError: null,
setParseError: (parseError) => set({ parseError }),
```

---

### Step 2 — Set/clear `parseError` in `useOntologySync`

**File:** `src/hooks/useOntologySync.ts`

In `onEditorChange`'s debounced parse step:
- **On success:** call `useOntologyStore.getState().setParseError(null)`
- **On failure:** call `useOntologyStore.getState().setParseError((e as Error).message ?? 'Invalid Turtle syntax')`

In `onCanvasChange` (canvas→editor path always produces valid Turtle):
- **On success:** call `useOntologyStore.getState().setParseError(null)`

---

### Step 3 — Fix load-on-mount in `useAutoSave`

**File:** `src/hooks/useAutoSave.ts`

The `.catch()` at line 35 must restore the raw text even when parsing fails:

```ts
.catch((e: unknown) => {
  // Restore raw text so the editor shows user's work after reload
  store.setTurtleSource(saved.ontology.turtleSource)
  store.setParseError((e as Error)?.message ?? 'Invalid Turtle syntax')
  console.warn('rosetta: restored invalid Turtle from IDB')
})
```

---

### Step 4 — Thread `parseError` into `TurtleEditorPanel`

**File:** `src/components/layout/RightPanel.tsx`

Read `parseError` from the store and pass it down:
```ts
const parseError = useOntologyStore((s) => s.parseError)
// ...
<TurtleEditorPanel turtleSource={turtleSource} onEditorChange={onEditorChange} parseError={parseError} />
```

---

### Step 5 — Add shadcn `Alert` component

Run:
```
npx shadcn@latest add alert --preset bcivVKZU
```

This generates `src/components/ui/alert.tsx` (consistent with the existing shadcn preset).

---

### Step 6 — Display error banner in `TurtleEditorPanel`

**File:** `src/components/panels/TurtleEditorPanel.tsx`

1. Add `parseError?: string | null` to `TurtleEditorPanelProps`
2. Import `Alert`, `AlertDescription` from `@/components/ui/alert`
3. Wrap return in a `flex flex-col h-full` outer div:
   - `containerRef` div becomes `flex-1 overflow-hidden`
   - Below it: conditionally rendered `Alert` with `variant="destructive"` (only when `parseError` is truthy)

```tsx
{parseError && (
  <Alert variant="destructive" className="shrink-0 rounded-none border-x-0 border-b-0 text-xs font-mono">
    <AlertDescription>{parseError}</AlertDescription>
  </Alert>
)}
```

---

## Files Modified

| File | Change |
|------|--------|
| `src/store/ontologyStore.ts` | Add `parseError` state + `setParseError` action |
| `src/hooks/useOntologySync.ts` | Set/clear `parseError` on parse success/failure |
| `src/hooks/useAutoSave.ts` | Restore `turtleSource` + set `parseError` in catch block |
| `src/components/layout/RightPanel.tsx` | Read + pass `parseError` prop |
| `src/components/ui/alert.tsx` | New — added via `npx shadcn add alert` |
| `src/components/panels/TurtleEditorPanel.tsx` | Add `parseError` prop, restructure layout, show `Alert` banner |

---

## Verification

1. Run `npm run dev`
2. Type valid Turtle → error banner is absent, canvas updates normally
3. Introduce a syntax error (e.g. remove a `.`) → after 600ms debounce, red banner appears with N3.js error message and line number
4. Fix the error → banner disappears, canvas re-syncs
5. With invalid Turtle in editor, wait for autosave ("Saved" indicator), then hard-refresh the page → editor should show the invalid Turtle, banner should display the parse error
6. Verify canvas is frozen at last valid state (nodes/edges unchanged)
7. Run `npm run test` — existing tests should still pass
