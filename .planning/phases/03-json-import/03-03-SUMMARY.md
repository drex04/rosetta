---
phase: 03-json-import
plan: 03
status: complete
requirements-completed: [REQ-21, REQ-23]
---

# Phase 3 Plan 03 — SourceNode + Canvas Integration

## What Was Built

- **SourceNode type** added to `src/types/index.ts` as `Node<ClassData & Record<string, unknown>, 'sourceNode'>` — the canonical type used across the entire app for amber source schema nodes.
- **SourceNode.tsx** updated to import and use the canonical type from `types/index.ts` (removed duplicate internal `SourceNodeType` alias).
- **OntologyCanvas.tsx**: RD-02 two-filter `onNodesChange` — splits changes by source node ID Set membership; master changes go to `ontologyStore` only, source changes go to `updateSource` via `applyNodeChanges`; guard skips source path when `activeSource` is null.
- **useCanvasData.ts**: returns merged `[...masterNodes, ...(active?.schemaNodes ?? [])]` and `[...masterEdges, ...(active?.schemaEdges ?? [])]`; `SourceNode[]` type applied, placeholder comment removed (RD-16).
- **sourcesStore.ts**: `Source.schemaNodes` typed as `SourceNode[]` and `Source.schemaEdges` typed as `OntologyEdge[]` — eliminates unsafe `as` casts at callsites.
- **jsonToSchema.ts**: `SchemaResult` updated to `nodes: SourceNode[], edges: OntologyEdge[]`; internal `SourceNode` alias removed.

## Must-Haves Verification

| Truth | Evidence |
|-------|----------|
| Amber schema nodes appear in left column after JSON paste | SourceNode registered in nodeTypes; schemaNodes merged into canvas at x=-520 via useCanvasData |
| Source switching preserves per-source node positions | Two-filter onNodesChange writes source drag positions to sourcesStore via updateSource; useCanvasData reads per-source schemaNodes |
| onNodesChange two-filter split (RD-02) | OntologyCanvas.tsx lines 45-76: Set-based split, never cross-applied |
| useCanvasData type cast updated, comment removed (RD-16) | useCanvasData.ts: no cast needed (store now typed); comment removed |

## Artifacts

| File | Role |
|------|------|
| `src/components/nodes/SourceNode.tsx` | Amber canvas node for source classes |
| `src/types/index.ts` | `SourceNode` type exported |
| `src/components/canvas/OntologyCanvas.tsx` | `sourceNode` registered; RD-02 two-filter change handler |
| `src/hooks/useCanvasData.ts` | Merged master+source nodes/edges |
| `src/store/sourcesStore.ts` | `Source.schemaNodes: SourceNode[]`, `schemaEdges: OntologyEdge[]` |
| `src/lib/jsonToSchema.ts` | `SchemaResult` typed with `SourceNode[]`/`OntologyEdge[]` |

## Commits

- `9463390` fix(03-02): register SourceNode component, fix drag and properties display (pre-existing)
- `4b7825d` feat(03-03): canvas source node integration + position persistence
- `97b6b77` feat(03-03): SourceNode component, canvas integration, store type safety

## Issues Encountered

None. Build clean (`tsc -b` + vite). Spec gate: PASS — no blocking TypeScript violations.
Store typing upgrade (Node[]→SourceNode[], Edge[]→OntologyEdge[]) eliminated all residual `as` casts.
