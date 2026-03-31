# Phase 8 (Plan 02): Source Schema Editing & Bidirectional Sync - Research

**Researched:** 2026-03-31
**Domain:** Bidirectional canvas-editor sync for source schemas (React Flow, CodeMirror 6, N3.js, Zustand)
**Confidence:** HIGH

## Summary

The ontology editor already has a well-tested bidirectional sync pattern (`useOntologySync`) that connects a CodeMirror Turtle editor to a React Flow canvas via two guarded paths: canvas-to-editor and editor-to-canvas. Source schemas currently lack this: they are auto-generated from JSON via `jsonToSchema`, displayed as read-only Turtle preview, and have no turtle string in the store. Replicating the ontology pattern for sources requires: (1) adding `turtleSource` and `parseError` per source in the store, (2) creating a `useSourceSync` hook mirroring `useOntologySync`, (3) making the SourcePanel's Turtle editor writable, (4) enabling source-node CRUD on the canvas, and (5) adding a "Reset to auto-generated" action.

**Primary recommendation:** Clone the `useOntologySync` pattern almost verbatim into a `useSourceSync` hook, scoped per-source via `activeSourceId`. Reuse `parseTurtle` from `rdf.ts` (it already returns the right node/edge types) but post-process to convert `classNode` type to `sourceNode` type and apply source-specific URI prefix and position column.

## Standard Stack

No new libraries needed. All existing stack is sufficient:

| Library | Version | Purpose | Already In Use |
|---------|---------|---------|----------------|
| N3.js | existing | Parse/serialize Turtle | YES |
| @xyflow/react | v12 | Canvas rendering | YES |
| CodeMirror 6 | existing | Turtle editor | YES |
| codemirror-lang-turtle | existing | Turtle syntax highlighting | YES |
| Zustand | existing | State management | YES |

## Architecture Patterns

### Pattern 1: Existing Ontology Bidirectional Sync (THE PATTERN TO REPLICATE)

The `useOntologySync` hook manages two directional flows with circular-update prevention:

**Flow A: Editor -> Canvas (user types Turtle)**
```
keystroke -> onEditorChange(newTurtle)
  1. Set hasPendingEdits = true
  2. Immediately write raw text: store.setTurtleSource(newTurtle)
  3. Clear previous debounce timer
  4. Start 600ms debounce timer
  5. On timer fire:
     a. if (isUpdatingFromCanvas) return  // guard
     b. await parseTurtle(newTurtle)
     c. isUpdatingFromEditor = true       // set guard
     d. Overlay existing positions onto parsed nodes (preserve drag positions)
     e. store.setNodes(positioned), store.setEdges(edges), store.setParseError(null)
     f. hasPendingEdits = false
     g. finally: isUpdatingFromEditor = false
  On parse error: store.setParseError(message), leave canvas unchanged
```

**Flow B: Canvas -> Editor (user drags/adds/deletes nodes)**
```
canvas interaction -> onCanvasChange(nodes, edges)
  1. if (isUpdatingFromEditor) return    // guard
  2. isUpdatingFromCanvas = true         // set guard
  3. turtle = await canvasToTurtle(nodes, edges)
  4. store.setTurtleSource(turtle)
  5. store.setParseError(null)
  6. finally: isUpdatingFromCanvas = false
```

**Guard flags (useRef, not state):**
- `isUpdatingFromCanvas` -- prevents editor->canvas path from running while canvas->editor serialization is in flight
- `isUpdatingFromEditor` -- prevents canvas->editor path from running while editor->canvas parse is in flight
- `hasPendingEdits` -- tracks whether user has unsaved edits (used externally)

**TurtleEditorPanel external update guard (R-03):**
The `TurtleEditorPanel` component has its own `isExternalUpdate` ref AND a `view.hasFocus` check. When `turtleSource` changes externally:
- If editor has focus, skip the dispatch entirely (prevents cursor jumps during typing)
- If editor does not have focus, set `isExternalUpdate = true`, dispatch content change, then `isExternalUpdate = false`

### Pattern 2: Canvas Node Change Routing (OntologyCanvas.tsx)

The `onNodesChange` handler already splits changes by node ownership:
```typescript
// Lines 60-99 of OntologyCanvas.tsx
const sourceNodeIds = new Set(activeSource?.schemaNodes.map(n => n.id) ?? [])
const masterChanges = changes.filter(c => !('id' in c) || !sourceNodeIds.has(c.id))
const sourceChanges = changes.filter(c => 'id' in c && sourceNodeIds.has(c.id))
// Master changes -> ontologyStore.setNodes(...)
// Source changes -> sourcesStore.updateSource(id, { schemaNodes: ... })
```

This is ALREADY routing source-node position changes correctly. What's missing: structural changes (add/remove/connect) for source nodes do NOT trigger a source sync callback.

### Pattern 3: Canvas Data Merging (useCanvasData.ts)

Single React Flow instance shows all node types merged:
```typescript
nodes = [...masterNodes, ...(active?.schemaNodes ?? [])]
edges = [...masterEdges, ...(active?.schemaEdges ?? []), ...mappingEdges]
```

Source nodes use type `'sourceNode'` (amber), master nodes use `'classNode'` (blue). Mapping edges use `'mappingEdge'` (dashed green). All share one React Flow viewport.

## Source Store Gap Analysis

### Current Source Interface
```typescript
interface Source {
  id: string
  name: string
  order: number
  json: string              // Raw JSON input
  schemaNodes: SourceNode[] // Auto-generated from json
  schemaEdges: OntologyEdge[] // Auto-generated from json
}
```

### Fields Needed for Editable Schemas

| Field | Type | Purpose | Status |
|-------|------|---------|--------|
| `id` | `string` | Source identifier | EXISTS |
| `name` | `string` | Display name, used for URI prefix | EXISTS |
| `order` | `number` | Tab ordering | EXISTS |
| `json` | `string` | Raw JSON input | EXISTS |
| `schemaNodes` | `SourceNode[]` | Canvas nodes | EXISTS |
| `schemaEdges` | `OntologyEdge[]` | Canvas edges | EXISTS |
| **`turtleSource`** | **`string`** | **Editable Turtle text** | **MISSING** |
| **`parseError`** | **`string \| null`** | **Parse error for Turtle editor** | **MISSING** |

### What Ontology Store Has That Source Store Lacks

| Feature | Ontology Store | Source Store | Gap |
|---------|---------------|-------------|-----|
| `turtleSource` | YES (top-level) | NO | Need per-source turtle string |
| `parseError` | YES (top-level) | NO | Need per-source parse error |
| `setTurtleSource` | YES (action) | NO | Need updateSource patch |
| `setParseError` | YES (action) | NO | Need updateSource patch |
| `loadTurtle` | YES (atomic parse+set) | NO | Useful for reset action |
| `setNodes` | YES (direct) | Indirect via updateSource | Sufficient -- updateSource with `{ schemaNodes }` works |
| `setEdges` | YES (direct) | Indirect via updateSource | Sufficient -- updateSource with `{ schemaEdges }` works |

**Key insight:** The source store uses `updateSource(id, patch)` rather than dedicated setters. Adding `turtleSource` and `parseError` to the `Source` interface and patching via `updateSource` is sufficient -- no new actions needed.

## Prescriptive Recommendations

### 1. Extend Source Interface

Add two fields to `Source` in `sourcesStore.ts`:
```typescript
export interface Source {
  id: string
  name: string
  order: number
  json: string
  schemaNodes: SourceNode[]
  schemaEdges: OntologyEdge[]
  turtleSource: string        // NEW: editable Turtle text
  parseError: string | null   // NEW: parse error display
}
```

All callers of `addSource` must now include `turtleSource` and `parseError`. The `jsonToSchema` result already produces `turtle` -- store it as `turtleSource` when creating a source.

### 2. Create useSourceSync Hook

Create `src/hooks/useSourceSync.ts` mirroring `useOntologySync` but scoped to the active source:

```typescript
export function useSourceSync() {
  const isUpdatingFromCanvas = useRef(false)
  const isUpdatingFromEditor = useRef(false)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Editor -> Canvas
  const onSourceEditorChange = useCallback((newTurtle: string) => {
    const { activeSourceId } = useSourcesStore.getState()
    if (!activeSourceId) return
    // Immediately write turtle to store
    useSourcesStore.getState().updateSource(activeSourceId, { turtleSource: newTurtle })
    // Debounce parse...
    debounceTimer.current = setTimeout(async () => {
      if (isUpdatingFromCanvas.current) return
      try {
        const { nodes, edges } = await parseTurtle(newTurtle)
        isUpdatingFromEditor.current = true
        // Convert OntologyNode -> SourceNode (change type, preserve positions)
        const sourceNodes = convertToSourceNodes(nodes, existingNodes)
        updateSource(activeSourceId, {
          schemaNodes: sourceNodes,
          schemaEdges: edges,
          parseError: null,
        })
      } catch (e) {
        updateSource(activeSourceId, { parseError: e.message })
      } finally {
        isUpdatingFromEditor.current = false
      }
    }, 600)
  }, [])

  // Canvas -> Editor
  const onSourceCanvasChange = useCallback(async (nodes: SourceNode[], edges: OntologyEdge[]) => {
    if (isUpdatingFromEditor.current) return
    isUpdatingFromCanvas.current = true
    // Need sourceCanvasToTurtle -- like canvasToTurtle but for SourceNode[]
    const turtle = await sourceCanvasToTurtle(nodes, edges)
    updateSource(activeSourceId, { turtleSource: turtle })
    isUpdatingFromCanvas.current = false
  }, [])

  return { onSourceEditorChange, onSourceCanvasChange }
}
```

### 3. Create sourceCanvasToTurtle Function

The existing `canvasToTurtle` in `rdf.ts` takes `OntologyNode[]`. Source nodes share the same `ClassData` shape but have type `'sourceNode'`. Two options:

**Option A (recommended):** Make `canvasToTurtle` generic -- it only reads `node.data` (ClassData), not `node.type`. It can already accept SourceNode[] if the type signature is widened:
```typescript
export async function canvasToTurtle(
  nodes: Array<{ id: string; data: ClassData & Record<string, unknown> }>,
  edges: OntologyEdge[],
): Promise<string>
```

**Option B:** Create a thin wrapper `sourceCanvasToTurtle` that casts and delegates. Less clean.

### 4. Convert parseTurtle Output for Source Nodes

`parseTurtle` returns `OntologyNode[]` (type: `'classNode'`). For source schemas, we need `SourceNode[]` (type: `'sourceNode'`). Write a converter:

```typescript
function toSourceNodes(
  ontologyNodes: OntologyNode[],
  existingSourceNodes: SourceNode[],
  sourcePrefix: string,
): SourceNode[] {
  return ontologyNodes.map(n => ({
    ...n,
    type: 'sourceNode' as const,
    position: existingSourceNodes.find(e => e.id === n.id)?.position ?? n.position,
    // Shift to source column if new node
  }))
}
```

**Critical:** Position overlay must check by node ID (same as ontology pattern) to preserve drag positions after re-parse.

### 5. Make SourcePanel Turtle Editor Writable

Currently `SourcePanel` renders the Turtle preview with `EditorState.readOnly.of(true)`. Changes needed:
- Remove `readOnly` extension
- Add an `updateListener` that calls `onSourceEditorChange`
- Wire external updates from `source.turtleSource` (same pattern as `TurtleEditorPanel`)
- Add `isExternalUpdate` ref + `hasFocus` guard (R-03 pattern)

**Alternative (cleaner):** Reuse `TurtleEditorPanel` component directly, passing `source.turtleSource` and `onSourceEditorChange` as props. This component already handles external updates, focus guards, and parse error display.

### 6. Canvas Source-Node Structural Changes

The `onNodesChange` handler in `OntologyCanvas.tsx` already routes position/select changes to the source store. For structural changes (add/remove), extend it:

```typescript
// After applying source changes:
if (sourceChanges.length > 0 && activeSource) {
  const hasStructural = sourceChanges.some(c => STRUCTURAL_CHANGE_TYPES.has(c.type))
  if (hasStructural && onSourceCanvasChange) {
    // Debounce and call onSourceCanvasChange(updatedSourceNodes, sourceEdges)
  }
}
```

The `OntologyCanvas` component needs a new prop: `onSourceCanvasChange`. The parent component wires this from `useSourceSync`.

### 7. Source Edge Changes on Canvas

Currently `OntologyCanvas` has NO `onEdgesChange` handler for source-internal edges (subclass/objectProperty edges between source nodes). Only mapping edges get `onEdgesDelete`. Need to add:
- An `onEdgesChange` callback that routes source-internal edge changes to the source store
- Connection validation for source-to-source connections (currently `isValidConnection` only allows `prop_` -> `target_prop_` which is mapping-specific)

### 8. Reset / Re-generate Pattern

When user clicks "Reset":
1. Re-run `jsonToSchema(source.json, source.name)` on the stored raw JSON
2. Replace `schemaNodes`, `schemaEdges`, and `turtleSource` with fresh output
3. Clear `parseError`
4. This is a single `updateSource(id, { schemaNodes, schemaEdges, turtleSource, parseError: null })`

The raw `json` field is always preserved -- it's the immutable input. Reset simply re-derives from it.

### 9. IDB Persistence

The `useAutoSave` hook already serializes `sourcesStore.sources` into `ProjectFile.sources`. Adding `turtleSource` and `parseError` to the `Source` interface means they are automatically included in the IDB snapshot -- no changes to `useAutoSave` needed.

**However:** On restore, `useAutoSave` does `useSourcesStore.setState({ sources: saved.sources })` directly (line 65-68). This will restore `turtleSource` as-is. No re-parse is needed on load since the nodes/edges are also restored. This matches the ontology pattern where invalid turtle is restored as raw text.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Turtle parsing | Custom parser | `parseTurtle` from `rdf.ts` | Already handles OWL classes, properties, subclass edges |
| Turtle serialization | Custom serializer | `canvasToTurtle` from `rdf.ts` (widen signature) | Handles prefixes, N3.Writer properly |
| Circular update prevention | Custom event system | `useRef` flag pair pattern from `useOntologySync` | Battle-tested, simple, synchronous |
| CodeMirror Turtle editor | Custom component | `TurtleEditorPanel` component (reuse) | Already has focus guard, external update, error display |
| Node position overlay | Complex diffing | Simple `find` by ID from existing array | Matches ontology pattern exactly |
| Schema re-generation | Manual node construction | `jsonToSchema` function | Already produces nodes, edges, turtle from JSON |

## Common Pitfalls

### Pitfall 1: Circular Update Loop
**What goes wrong:** Editor change triggers canvas update, which triggers editor update, infinite loop.
**Why it happens:** Both paths write to the same store fields without guards.
**How to avoid:** Use the `isUpdatingFromCanvas` / `isUpdatingFromEditor` ref pair. These MUST be `useRef` (synchronous), NOT `useState` (async batched).
**Warning signs:** Console floods with rapid state updates, browser tab freezes.

### Pitfall 2: Source Switching During Debounce
**What goes wrong:** User switches active source while a 600ms debounce is pending. The timer fires and writes parsed nodes to the WRONG source.
**Why it happens:** Closure captures `activeSourceId` at debounce creation time.
**How to avoid:** On timer fire, re-read `activeSourceId` from store. If it changed, discard the pending parse. Also clear timers on source switch.
**Warning signs:** Nodes appear on wrong source after rapid tab switching.

### Pitfall 3: Node Type Mismatch After Parse
**What goes wrong:** `parseTurtle` returns `OntologyNode` (type: `'classNode'`). If stored as-is in `schemaNodes`, canvas renders blue nodes instead of amber.
**Why it happens:** `parseTurtle` is ontology-focused, hardcodes `type: 'classNode'`.
**How to avoid:** Always convert `type` from `'classNode'` to `'sourceNode'` after parsing for source schemas.

### Pitfall 4: URI Prefix Loss on Manual Edit
**What goes wrong:** User edits source Turtle, changes the `@prefix` declaration, and the source prefix no longer matches what `jsonToSchema` would generate.
**Why it happens:** `deriveUriPrefix` in `jsonToSchema.ts` creates prefixes like `src_norwayradar_`. Manual edits could change this.
**How to avoid:** After parsing user-edited Turtle, extract the actual prefix from the parsed nodes (all source nodes share `data.prefix`). Update the source's effective prefix. For reset, `jsonToSchema` re-derives the canonical prefix.
**Warning signs:** Mapping edges break because `sourceClassUri` no longer matches any node's `data.uri`.

### Pitfall 5: Node ID Instability Breaks Mappings
**What goes wrong:** After re-parsing edited Turtle, node IDs change (because `parseTurtle` generates IDs as `node_${localName(uri)}`). Existing mappings reference old source node IDs via `sourceClassUri` lookup (not by node ID directly), so mappings survive URI-based lookup BUT position overlay fails.
**Why it happens:** `parseTurtle` deterministically generates IDs from URIs: `node_${localName(uri)}`. If user changes a class URI in Turtle, the node gets a new ID.
**How to avoid:** Position overlay should match by `data.uri` as fallback when ID match fails. Mappings already match by `data.uri`, so they are robust.

### Pitfall 6: Cursor Jump in Turtle Editor
**What goes wrong:** User is typing in the Turtle editor, canvas sync writes back to `turtleSource`, editor content is replaced, cursor jumps to wrong position.
**Why it happens:** External update dispatched while editor has focus.
**How to avoid:** The `TurtleEditorPanel` already has a `view.hasFocus` guard (R-03). If reusing that component, this is handled. If building a new editor, MUST replicate this guard.

### Pitfall 7: Source Edge Type Confusion
**What goes wrong:** Source-internal edges (subclass, objectProperty) get confused with mapping edges in event handlers.
**Why it happens:** All edges are in one React Flow instance. `onEdgesDelete` currently only handles `mapping_` prefixed edges.
**How to avoid:** Source-internal edges need distinct ID prefixes (e.g., `src_e_*`) and the edge delete handler must route them to the source store.

## Code Examples

### Existing: How onCanvasChange is wired (App.tsx / parent level)

```typescript
// In the parent that renders OntologyCanvas:
const { onEditorChange, onCanvasChange } = useOntologySync()
<OntologyCanvas onCanvasChange={onCanvasChange} />
<TurtleEditorPanel
  turtleSource={turtleSource}
  onEditorChange={onEditorChange}
  parseError={parseError}
/>
```

### Existing: Position Overlay Pattern (useOntologySync lines 51-55)

```typescript
// After parsing, overlay existing positions so dragged nodes keep location
const currentNodes = useOntologyStore.getState().nodes
const positioned = nodes.map((n) => ({
  ...n,
  position: currentNodes.find((c) => c.id === n.id)?.position ?? n.position,
}))
```

### Existing: Source Node Change Routing (OntologyCanvas lines 64-98)

```typescript
const sourceNodeIds = new Set(activeSource?.schemaNodes.map((n) => n.id) ?? [])
const masterChanges = changes.filter((c) => !('id' in c) || !sourceNodeIds.has(c.id))
const sourceChanges = changes.filter((c) => 'id' in c && sourceNodeIds.has(c.id))
```

### Existing: jsonToSchema Stores Turtle

```typescript
// jsonToSchema already produces turtle (line 392 of jsonToSchema.ts)
const turtle = serializeToTurtle(ctx.nodes, ctx.edges, uriBase, prefixAlias, ctx.warnings)
return { nodes, edges, turtle, warnings }
```

Currently this turtle is used only for the read-only preview. It should be stored as `source.turtleSource`.

## Open Questions

1. **Source-to-source connections on canvas?**
   - What we know: Currently `isValidConnection` only allows `prop_` -> `target_prop_` (mapping connections). Source-internal objectProperty edges are auto-generated.
   - What's unclear: Should users be able to draw new objectProperty edges between source nodes on canvas?
   - Recommendation: Defer canvas-based source edge creation. Users can add objectProperties by editing the Turtle. This simplifies the canvas change routing significantly.

2. **Add new source class from canvas?**
   - What we know: Ontology supports adding classes via canvas (though the mechanism is not obvious from the code -- it may be Turtle-only).
   - What's unclear: Should there be a "Add class" button/gesture for source nodes on canvas?
   - Recommendation: Initially support adding classes only via Turtle editing. Canvas is for repositioning and viewing. This matches the ontology pattern.

3. **What happens to mappings when source schema changes?**
   - What we know: Mappings reference `sourceClassUri` and `sourcePropUri`. If user renames a class or removes a property in Turtle, mappings become orphaned.
   - Recommendation: Orphaned mappings should be visually flagged (no source node found) but NOT auto-deleted. User may undo the edit or fix the URI.

## Validation Architecture

> `workflow.nyquist_validation` not set in config.json -- treating as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest |
| Config file | `vitest.config.ts` (or vite.config.ts with test block) |
| Quick run command | `npm run test` |
| Full suite command | `npm run build && npm run test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SRC-01 | Source store has turtleSource/parseError fields | unit | `npx vitest run src/__tests__/sourcesStore.test.ts -t "turtleSource"` | Likely not |
| SRC-02 | useSourceSync prevents circular updates | unit | `npx vitest run src/__tests__/sourceSync.test.ts` | No - Wave 0 |
| SRC-03 | parseTurtle output converts to SourceNode type | unit | `npx vitest run src/__tests__/rdf.test.ts -t "source"` | No - Wave 0 |
| SRC-04 | canvasToTurtle works with SourceNode input | unit | `npx vitest run src/__tests__/rdf.test.ts -t "sourceCanvasToTurtle"` | No - Wave 0 |
| SRC-05 | Reset re-generates from JSON | unit | `npx vitest run src/__tests__/sourceReset.test.ts` | No - Wave 0 |
| SRC-06 | IDB round-trip preserves turtleSource | unit | `npx vitest run src/__tests__/autoSave.test.ts -t "source turtle"` | No - extend existing |

### Sampling Rate
- **Per task commit:** `npm run test`
- **Per wave merge:** `npm run build && npm run test`
- **Phase gate:** Full suite green before `verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/sourceSync.test.ts` -- covers SRC-02 (circular update prevention)
- [ ] `src/__tests__/rdf.test.ts` -- extend with source node conversion tests (SRC-03, SRC-04)
- [ ] `src/__tests__/sourceReset.test.ts` -- covers SRC-05

## Sources

### Primary (HIGH confidence)
- Direct code reading: `useOntologySync.ts`, `ontologyStore.ts`, `sourcesStore.ts`, `OntologyCanvas.tsx`, `useCanvasData.ts`, `SourcePanel.tsx`, `TurtleEditorPanel.tsx`, `rdf.ts`, `jsonToSchema.ts`, `types/index.ts`, `useAutoSave.ts`
- All findings are from the actual codebase -- no external sources needed for this research

### Secondary (MEDIUM confidence)
- CLAUDE.md project conventions (bidirectional sync flags, `localName` import rule, IDB persistence pattern)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries, all existing
- Architecture: HIGH -- direct code analysis of the pattern to replicate
- Pitfalls: HIGH -- derived from actual code paths and known edge cases in CLAUDE.md
- Sync flow: HIGH -- line-by-line analysis of useOntologySync.ts

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (stable -- all internal code patterns)
