# Phase 3: JSON Import (Multi-Source) — Design

**Date:** 2026-03-25
**Status:** Approved

## Summary

Multiple source systems can be loaded; each produces an RDFS schema displayed on the canvas left side (amber color scheme). Switching sources swaps left-side nodes with positions preserved per source.

## Plan Split

| Plan | Focus | REQs |
|------|-------|------|
| 03-01 | Source store hardening + SourceSelector UI (pills, add/rename/delete) | REQ-17, REQ-18 |
| 03-02 | JSON→RDFS converter + SRC tab (CodeMirror JSON editor + generated Turtle preview) | REQ-19, REQ-20, REQ-22, REQ-24 |
| 03-03 | Canvas amber nodes + source switching (positions preserved per source) | REQ-21, REQ-23 |

## Core Data Flow

```
User pastes JSON (SRC tab)
    │
    ▼
jsonToSchema(json, sourceName) → { nodes: SourceNode[], edges: SourceEdge[], turtle: string }
    │                             (stored in source.schemaNodes / schemaEdges)
    ▼
useCanvasData() merges [masterNodes...amber schemaNodes] → OntologyCanvas
    │
    ▼
Switching active source → swaps schemaNodes/Edges, restores saved positions
```

## Key Architectural Notes

- `sourcesStore` already has correct shape; needs `updateSource` action added
- `useCanvasData` already merges master + active source — ready
- Source nodes: amber color (`#f59e0b`) vs master blue (`#3b82f6`)
- URI prefix derived from source name (e.g. "Norwegian Radar" → `src_norwegian_radar:`)
- Each source preserves its own node positions in `schemaNodes[].position`
