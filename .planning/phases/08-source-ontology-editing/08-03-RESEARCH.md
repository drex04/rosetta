# Phase 8 (Plan 03): Join Node Type & Ontology Editor Audit - Research

**Researched:** 2026-03-31
**Domain:** React Flow custom nodes, multi-field join mappings, ontology canvas editing
**Confidence:** HIGH (codebase analysis) / MEDIUM (React Flow dynamic handles — verified via docs + WebSearch)

## Summary

This research covers two deliverables: (1) a new JoinNode canvas element that visually represents multi-field-to-single-field mappings (REQ-67), and (2) an audit of the ontology editor for completeness (REQ-66). The existing codebase has a well-established pattern for custom nodes (ClassNode, SourceNode) and custom edges (MappingEdge, SubclassEdge, ObjectPropertyEdge) registered in OntologyCanvas.tsx. The current `join` mapping kind exists in the type system but is a placeholder — it generates a SPARQL stub with `FILTER(false)` and uses cross-source join fields (parentSourceId/parentRef/childRef) which model a different concept (cross-source key joins) than what REQ-67 describes (multi-field concatenation within a single source).

The ontology editor audit reveals a significant gap: there are **no canvas-level editing operations** — no add/delete node, no add/remove property, no draw edge, no context menu, no node palette. All ontology changes currently go through the Turtle editor with bidirectional sync. REQ-66 requires these canvas operations to work directly.

**Primary recommendation:** Implement JoinNode as a new React Flow custom node type with dynamic target handles (one per incoming source property) and a single source handle for output. Store join configuration in a new `joinNodes` collection in the mapping store. For the ontology editor, add a canvas context menu and node editing dialog rather than inline editing.

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @xyflow/react | ^12.10.1 | Canvas with custom nodes/edges | Already in use, supports dynamic handles |
| zustand | (existing) | State management | Already manages ontology, sources, mappings |
| N3.js | (existing) | RDF parsing/serialization | Turtle round-trip for ontology changes |

### Supporting (no new dependencies needed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @phosphor-icons/react | (existing) | Icons for JoinNode, context menus | Node header icon, menu icons |
| shadcn/ui Dialog | (existing) | Property editor dialog, join config | Modal editing forms |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Dynamic handles on JoinNode | Fixed N-input handles | Dynamic is better — join inputs vary from 2-5 fields; fixed wastes space |
| Canvas context menu (custom) | react-contexify | Custom is better — minimal needs, no new dependency, matches existing patterns |
| Inline node editing | Dialog-based editing | Dialog is better — less React Flow complexity, cleaner UX for property forms |

## Architecture Patterns

### JoinNode Component Pattern

The JoinNode sits between source nodes (left) and ontology target nodes (right) on the canvas. It accepts multiple incoming mapping edges on its left side and outputs a single edge on its right side.

```
[SourceNode]--prop_firstName-->|                    |
                               | JoinNode           |-->target_prop_fullName-->[ClassNode]
[SourceNode]--prop_lastName--->| CONCAT("{0} {1}")  |
```

### JoinNode Data Model

```typescript
// New type in src/types/index.ts
export interface JoinNodeData {
  label: string                    // e.g. "Join: fullName"
  joinStrategy: 'concat' | 'coalesce' | 'template'
  separator: string                // for concat, default " "
  templatePattern?: string         // for template, e.g. "{0}, {1}"
  inputHandles: string[]           // dynamic list of handle IDs, e.g. ["join_in_0", "join_in_1"]
  outputTargetClassUri: string     // the ontology class this maps to
  outputTargetPropUri: string      // the ontology property this maps to
  sourceId: string                 // which source this join belongs to
}

export type JoinNode = import('@xyflow/react').Node<
  JoinNodeData & Record<string, unknown>,
  'joinNode'
>
```

### JoinNode Storage

Store join nodes in the mapping store alongside mappings, keyed by sourceId:

```typescript
// In mappingStore.ts — new fields
interface MappingState {
  // ... existing fields ...
  joinNodes: Record<string, JoinNodeData[]>  // keyed by sourceId
  addJoinNode: (sourceId: string, data: JoinNodeData) => string
  removeJoinNode: (sourceId: string, nodeId: string) => void
  updateJoinNode: (sourceId: string, nodeId: string, patch: Partial<JoinNodeData>) => void
}
```

### React Flow Registration Pattern

Following the existing pattern in OntologyCanvas.tsx:

```typescript
import { JoinNode as JoinNodeComponent } from '../nodes/JoinNode'

const nodeTypes = {
  classNode: ClassNode,
  sourceNode: SourceNodeComponent,
  joinNode: JoinNodeComponent,        // ADD THIS
} as const
```

### JoinNode Component Structure

```typescript
// src/components/nodes/JoinNode.tsx
import { Handle, Position, useUpdateNodeInternals } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { GitMergeIcon } from '@phosphor-icons/react'
import type { JoinNode as JoinNodeType } from '@/types/index'
import { useEffect } from 'react'

export function JoinNode({ id, data }: NodeProps<JoinNodeType>) {
  const updateNodeInternals = useUpdateNodeInternals()

  // CRITICAL: When inputHandles array changes, React Flow must
  // recalculate handle positions. Without this, edges won't connect
  // to dynamically added handles.
  useEffect(() => {
    updateNodeInternals(id)
  }, [id, data.inputHandles.length, updateNodeInternals])

  return (
    <div className="bg-white border-2 border-emerald-500 rounded-md shadow-md min-w-[160px] text-sm">
      {/* Header */}
      <div className="bg-emerald-500 px-3 py-2 flex items-center gap-2 rounded-t-[4px]">
        <GitMergeIcon weight="bold" className="text-white" size={14} />
        <span className="text-white font-semibold">{data.label}</span>
      </div>

      {/* Dynamic input handles — one per source property */}
      <div className="divide-y divide-border">
        {data.inputHandles.map((handleId, i) => (
          <div key={handleId} className="relative px-3 py-1.5 flex items-center">
            <Handle
              id={handleId}
              type="target"
              position={Position.Left}
              className="!w-2.5 !h-2.5 !bg-emerald-500 !border-emerald-700"
              isConnectable={true}
            />
            <span className="text-muted-foreground text-xs">Input {i + 1}</span>
          </div>
        ))}
      </div>

      {/* Strategy label */}
      <div className="px-3 py-1 text-xs text-muted-foreground border-t">
        {data.joinStrategy === 'concat' && `CONCAT("${data.separator}")`}
        {data.joinStrategy === 'coalesce' && 'COALESCE (first non-null)'}
        {data.joinStrategy === 'template' && `Template: ${data.templatePattern}`}
      </div>

      {/* Single output handle */}
      <Handle
        id="join_output"
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-emerald-500 !border-emerald-700"
        isConnectable={true}
        style={{ top: '50%' }}
      />
    </div>
  )
}
```

### Anti-Patterns to Avoid
- **Do NOT store JoinNode state in ontologyStore:** JoinNodes are mapping constructs, not ontology elements. They belong in mappingStore.
- **Do NOT use fixed handle count:** The whole point is dynamic multi-input. Use `useUpdateNodeInternals` when handles change.
- **Do NOT create mapping edges for JoinNode output manually:** The join output edge should be auto-generated when the JoinNode is configured with a target property.
- **Do NOT mix join node IDs with ontology node IDs:** Use a `join_` prefix for join node IDs to avoid collisions.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Dynamic handle registration | Manual DOM measurement | `useUpdateNodeInternals()` from @xyflow/react | React Flow needs to know when handles change to recalculate connection positions |
| SPARQL CONCAT generation | String concatenation of SPARQL | Extend `generateConstruct` with proper BIND/CONCAT patterns | Existing function handles all mapping kinds; join should follow same pattern |
| Node position calculation | Manual coordinate math | React Flow's built-in layout or simple offset from source nodes | Consistent with existing node positioning |

## Common Pitfalls

### Pitfall 1: Stale Handle Positions After Dynamic Handle Changes
**What goes wrong:** Adding a new input to a JoinNode renders the Handle component, but React Flow doesn't know the handle exists until `useUpdateNodeInternals` is called. Edges fail to connect or connect to wrong positions.
**Why it happens:** React Flow caches handle positions for performance. Dynamic handle changes bypass this cache.
**How to avoid:** Call `useUpdateNodeInternals(nodeId)` in a `useEffect` that depends on the handles array length.
**Warning signs:** Edges visually connect to the wrong spot, or `isValidConnection` rejects connections to new handles.

### Pitfall 2: Circular Sync with JoinNode + Turtle Editor
**What goes wrong:** JoinNodes exist on the canvas but have no Turtle representation. If canvas-to-Turtle sync fires, JoinNodes get lost. If Turtle-to-canvas sync fires, JoinNodes get removed.
**Why it happens:** The bidirectional sync (`useOntologySync`) only knows about ontology nodes parsed from Turtle.
**How to avoid:** JoinNodes must be excluded from the ontology sync cycle. They live in mappingStore, not ontologyStore. The `useCanvasData` hook should merge them into the visible nodes array but they should never enter `canvasToTurtle`.

### Pitfall 3: Connection Validation Must Allow JoinNode Connections
**What goes wrong:** The existing `isValidConnection` in OntologyCanvas.tsx only allows connections where sourceHandle starts with `prop_` and targetHandle starts with `target_prop_`. JoinNode handles use different prefixes.
**Why it happens:** Validation was written for source-to-ontology direct mappings only.
**How to avoid:** Extend `isValidConnection` to also accept: (a) source `prop_*` to join target `join_in_*`, and (b) join source `join_output` to ontology target `target_prop_*`.

### Pitfall 4: No Canvas Editing Operations Exist for Ontology
**What goes wrong:** REQ-66 expects create/delete nodes, add/remove properties, draw/delete edges from the canvas. Currently NONE of these exist — all editing goes through Turtle text.
**Why it happens:** Phase 2 implemented bidirectional sync but only the Turtle-to-canvas direction for editing. Canvas is view-only with drag support.
**How to avoid:** Must implement: (a) context menu on canvas pane for "Add Class", (b) context menu on nodes for "Add Property" / "Delete Node", (c) native React Flow edge creation for SubclassEdge/ObjectPropertyEdge (currently `isConnectable={false}` on ClassNode handles), (d) edge deletion.

### Pitfall 5: Handle ID Conflicts Between Source and Join Nodes
**What goes wrong:** If a JoinNode input handle has the same ID pattern as a source node property handle, edges route incorrectly.
**Why it happens:** Both source nodes and join nodes sit on the left side of the canvas.
**How to avoid:** Use distinct handle ID prefixes: source properties use `prop_*`, join inputs use `join_in_*`, join output uses `join_output`.

## Code Examples

### SPARQL Generation for Join Kinds

#### Concat Strategy (firstName + lastName -> fullName)
```sparql
PREFIX src: <http://example.org/source#>
PREFIX tgt: <http://nato.int/onto#>

CONSTRUCT {
  ?target a tgt:Person .
  ?target tgt:fullName ?joinedVal .
}
WHERE {
  ?source a src:Person .
  ?source src:firstName ?v0 .
  ?source src:lastName ?v1 .
  BIND(CONCAT(STR(?v0), " ", STR(?v1)) AS ?joinedVal)
}
```

#### Coalesce Strategy (first non-null)
```sparql
PREFIX src: <http://example.org/source#>
PREFIX tgt: <http://nato.int/onto#>

CONSTRUCT {
  ?target a tgt:Track .
  ?target tgt:identifier ?joinedVal .
}
WHERE {
  ?source a src:Track .
  OPTIONAL { ?source src:trackId ?v0 . }
  OPTIONAL { ?source src:altId ?v1 . }
  BIND(COALESCE(?v0, ?v1) AS ?joinedVal)
}
```

#### Template Strategy
```sparql
PREFIX src: <http://example.org/source#>
PREFIX tgt: <http://nato.int/onto#>

CONSTRUCT {
  ?target a tgt:Track .
  ?target tgt:label ?joinedVal .
}
WHERE {
  ?source a src:Track .
  ?source src:type ?v0 .
  ?source src:id ?v1 .
  BIND(CONCAT(STR(?v0), "-", STR(?v1)) AS ?joinedVal)
}
```

### Extending generateConstruct for Multi-Field Joins

```typescript
// In src/lib/sparql.ts — new function for join nodes
export function generateJoinConstruct(params: {
  sourceId: string
  sourceClassUri: string
  inputPropUris: string[]        // ordered list of source properties
  targetClassUri: string
  targetPropUri: string
  joinStrategy: 'concat' | 'coalesce' | 'template'
  separator?: string
  templatePattern?: string
}): string {
  const { inputPropUris, joinStrategy, separator = ' ' } = params
  const srcPrefix = derivePrefix(params.sourceClassUri)
  const tgtPrefix = derivePrefix(params.targetClassUri)
  const srcClass = localName(params.sourceClassUri)
  const tgtClass = localName(params.targetClassUri)
  const tgtProp = localName(params.targetPropUri)

  const vars = inputPropUris.map((_, i) => `?v${i}`)
  const bindings = inputPropUris.map((uri, i) => {
    const prop = localName(uri)
    return joinStrategy === 'coalesce'
      ? `  OPTIONAL { ?source src:${prop} ${vars[i]} . }`
      : `  ?source src:${prop} ${vars[i]} .`
  })

  let bindExpr: string
  if (joinStrategy === 'concat') {
    const parts = vars.map((v) => `STR(${v})`).join(`, "${separator}", `)
    bindExpr = `CONCAT(${parts})`
  } else if (joinStrategy === 'coalesce') {
    bindExpr = `COALESCE(${vars.join(', ')})`
  } else {
    // template — same as concat but with custom separator from pattern
    const parts = vars.map((v) => `STR(${v})`).join(`, "${separator}", `)
    bindExpr = `CONCAT(${parts})`
  }

  return [
    `PREFIX src: <${srcPrefix}>`,
    `PREFIX tgt: <${tgtPrefix}>`,
    ``,
    `CONSTRUCT {`,
    `  ?target a tgt:${tgtClass} .`,
    `  ?target tgt:${tgtProp} ?joinedVal .`,
    `}`,
    `WHERE {`,
    `  ?source a src:${srcClass} .`,
    ...bindings,
    `  BIND(${bindExpr} AS ?joinedVal)`,
    `}`,
  ].join('\n')
}
```

### useCanvasData Hook Extension for JoinNodes

```typescript
// In useCanvasData.ts — add join nodes to visible nodes
const joinNodesForCanvas = useMemo((): JoinNode[] => {
  if (!activeSourceId) return []
  const joinData = useMappingStore.getState().joinNodes[activeSourceId] ?? []
  return joinData.map((jn, i) => ({
    id: `join_${activeSourceId}_${i}`,
    type: 'joinNode' as const,
    position: jn.position ?? { x: 300, y: i * 120 },
    data: jn as JoinNodeData & Record<string, unknown>,
  }))
}, [activeSourceId, joinNodes])

const nodes = useMemo(
  () => [...masterNodes, ...(active?.schemaNodes ?? []), ...joinNodesForCanvas],
  [masterNodes, active?.schemaNodes, joinNodesForCanvas],
)
```

## Ontology Editor Audit (REQ-66)

### Current State

| Operation | Status | How It Works Now |
|-----------|--------|------------------|
| Create class node | MISSING from canvas | Only via Turtle editor (type `nato:Foo a owl:Class`) |
| Delete class node | MISSING from canvas | Only via Turtle editor (remove class declaration) |
| Add property to class | MISSING from canvas | Only via Turtle editor (add DatatypeProperty triple) |
| Remove property from class | MISSING from canvas | Only via Turtle editor (remove property triples) |
| Draw SubclassEdge | MISSING from canvas | Only via Turtle (`rdfs:subClassOf`); ClassNode handles have `isConnectable={false}` |
| Draw ObjectPropertyEdge | MISSING from canvas | Only via Turtle; ClassNode handles have `isConnectable={false}` |
| Delete edge | MISSING for ontology edges | `onEdgesDelete` only handles `mapping_*` prefixed edges |
| Change edge type | MISSING | No UI for this |
| Move nodes (drag) | WORKS | `nodesDraggable={true}` + `onNodesChange` |
| Turtle-to-canvas sync | WORKS | `useOntologySync` with debounce |
| Canvas-to-Turtle sync | WORKS | `canvasToTurtle` in `useOntologySync` |

### Gap Analysis — What Must Be Implemented

1. **Canvas context menu (pane-level):** Right-click on empty canvas area -> "Add Class Node" dialog (enter label, URI prefix auto-derived).

2. **Node context menu:** Right-click on ClassNode -> "Add Property" (enter label, range type picker), "Delete Node" (with confirmation if properties/edges exist), "Edit Label".

3. **Enable ontology handle connections:** Change `isConnectable={false}` to `isConnectable={true}` on ClassNode's class-level handles (class-top, class-bottom, class-left, class-right). Add connection handler that creates SubclassEdge or ObjectPropertyEdge in ontologyStore.

4. **Edge creation flow:** When connecting two ClassNode class-level handles, show a picker: "SubclassOf" or "ObjectProperty" (with label input for ObjectProperty). Then add to ontologyStore.edges AND trigger canvasToTurtle sync.

5. **Ontology edge deletion:** Extend `onEdgesDelete` to handle edges without `mapping_` prefix — find the edge in ontologyStore.edges and remove it, then trigger canvasToTurtle sync.

6. **New ontologyStore actions needed:**
   - `addNode(classData: ClassData): void` — create node with auto-positioned placement
   - `removeNode(nodeId: string): void` — remove node and all its edges
   - `addPropertyToNode(nodeId: string, prop: PropertyData): void` — add property row
   - `removePropertyFromNode(nodeId: string, propUri: string): void` — remove property row
   - `addEdge(edge: OntologyEdge): void` — add edge (subclass or object property)
   - `removeEdge(edgeId: string): void` — remove edge

7. **Sync trigger:** Each store mutation above must trigger `canvasToTurtle` to keep Turtle in sync. Use the existing `onCanvasChange` callback pattern.

### Recommended Approach

Use **dialogs** (shadcn Dialog) for create/edit forms rather than inline editing. This keeps the ClassNode component simple and avoids complex contentEditable logic within React Flow nodes.

For edge type selection during connection, use a small popover/dropdown that appears at the midpoint of the newly drawn edge.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `useUpdateNodeInternals` (imperative) | Still current in RF v12 | Unchanged in v12 | Must call when dynamic handles change |
| `reactflow` package | `@xyflow/react` | v12 (July 2024) | Already migrated in this project |
| `isValidConnection` on ReactFlow | Same API in v12 | Stable | Must extend for JoinNode handle patterns |

## Open Questions

1. **JoinNode positioning:** Where should JoinNodes appear on the canvas? Between source (left) and ontology (right) columns. Recommend x-position at midpoint (~300px) with auto-stacking vertically.
   - Recommendation: Store position in JoinNodeData, default to midpoint of source and ontology column X values.

2. **Adding inputs to JoinNode:** Should the user click a "+" button on the JoinNode to add an input, then drag an edge to it? Or should dragging an edge from a source property to the JoinNode auto-create a new input handle?
   - Recommendation: Auto-create on connection. When a source prop edge connects to a JoinNode's general drop zone, add a new input handle. Also provide a "+" button for manual addition. This matches the "progressive disclosure" UX pattern.

3. **JoinNode deletion cascade:** When a JoinNode is deleted, should its output mapping also be deleted?
   - Recommendation: Yes. Delete the JoinNode, all its input edges, and the output mapping edge in one atomic operation.

4. **Persisting JoinNodes in project files:** The ProjectFile type needs a new `joinNodes` field.
   - Recommendation: Add `joinNodes?: Record<string, JoinNodeData[]>` to ProjectFile interface.

## Validation Architecture

> `workflow.nyquist_validation` is not set in config.json; treating as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest |
| Config file | vitest.config.ts (implied by npm run test) |
| Quick run command | `npm run test` |
| Full suite command | `npm run build && npm run test` |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REQ-66 | Ontology canvas editing (add/delete node, property, edge) | integration | `npm run test -- --grep "ontology editor"` | No - Wave 0 |
| REQ-67 | JoinNode renders with dynamic handles | unit | `npm run test -- --grep "JoinNode"` | No - Wave 0 |
| REQ-67 | JoinNode SPARQL generation (concat, coalesce, template) | unit | `npm run test -- --grep "generateJoinConstruct"` | No - Wave 0 |
| REQ-67 | JoinNode connection validation accepts join handles | unit | `npm run test -- --grep "isValidConnection.*join"` | No - Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test`
- **Per wave merge:** `npm run build && npm run test`
- **Phase gate:** Full suite green before `verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/joinNode.test.ts` -- covers REQ-67 JoinNode rendering and SPARQL generation
- [ ] `src/__tests__/ontologyEditor.test.ts` -- covers REQ-66 canvas editing operations
- [ ] `src/__tests__/sparql.test.ts` -- extend existing file with generateJoinConstruct tests

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `src/components/nodes/ClassNode.tsx`, `SourceNode.tsx` -- node component patterns
- Codebase analysis: `src/components/canvas/OntologyCanvas.tsx` -- nodeTypes/edgeTypes registration, connection handlers, isValidConnection
- Codebase analysis: `src/store/ontologyStore.ts` -- no editing actions (setNodes/setEdges only)
- Codebase analysis: `src/store/mappingStore.ts` -- mapping CRUD pattern
- Codebase analysis: `src/types/index.ts` -- Mapping.kind includes 'join' with parentSourceId/parentRef/childRef
- Codebase analysis: `src/lib/sparql.ts` -- existing join kind generates placeholder SPARQL
- Codebase analysis: `src/hooks/useCanvasData.ts` -- node/edge assembly pattern

### Secondary (MEDIUM confidence)
- [React Flow Custom Nodes docs](https://reactflow.dev/learn/customization/custom-nodes) -- dynamic handle pattern, useUpdateNodeInternals requirement
- [React Flow Handle API](https://reactflow.dev/api-reference/components/handle) -- Handle props including unique id requirement
- [React Flow dynamic handles issue #1641](https://github.com/xyflow/xyflow/issues/1641) -- confirms useUpdateNodeInternals approach
- [React Flow v12 release](https://xyflow.com/blog/react-flow-12-release) -- useConnection hook for ongoing connection state
- [@xyflow/react npm](https://www.npmjs.com/package/@xyflow/react) -- confirms v12.x is current

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already installed, no new dependencies needed
- Architecture (JoinNode): HIGH -- follows established node/edge patterns in codebase exactly
- Architecture (Ontology Editor): HIGH -- gap analysis is definitive from code inspection (no editing actions exist)
- Pitfalls: HIGH -- identified from concrete code analysis (isValidConnection, sync cycle, handle IDs)
- SPARQL generation: MEDIUM -- CONCAT/COALESCE patterns are standard SPARQL but template strategy needs validation with Comunica in-browser

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (stable — @xyflow/react v12 API is mature)
