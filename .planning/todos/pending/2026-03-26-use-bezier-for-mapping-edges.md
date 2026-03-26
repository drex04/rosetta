---
created: 2026-03-26T11:46:45.278Z
title: Use bezier edge type for mapping (green) edges
area: ui
files:
  - src/hooks/useCanvasData.ts:49
---

## Problem

Mapping edges (the dashed green edges connecting SRC handles to ONTO handles) currently use the `mappingEdge` custom type. The user wants them rendered as bezier curves for a visually distinct style from the ontology edges.

## Solution

In `src/hooks/useCanvasData.ts` where `mappingEdge` objects are constructed (line ~49), configure the React Flow edge to render as a bezier. Either: (a) update the `MappingEdge` custom component to use `getBezierPath` internally, or (b) set `type: 'default'` (React Flow's default is bezier) on mapping edges and keep styling via `style`/`className`. The dashed-green visual must be preserved — only the path shape changes.
