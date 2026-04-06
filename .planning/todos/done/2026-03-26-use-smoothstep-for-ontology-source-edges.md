---
created: 2026-03-26T11:46:45.278Z
title: Use smoothstep edge type for ontology and source edges
area: ui
files:
  - src/lib/rdf.ts:166
  - src/lib/rdf.ts:197
  - src/lib/jsonToSchema.ts:176
---

## Problem

Edges between SRC and ONTO nodes (`subclassEdge`, `objectPropertyEdge`) use the default React Flow edge style. The user wants them rendered as `smoothstep` for a cleaner tree appearance.

## Solution

These edge types are custom React Flow edge components. Add `type: 'smoothstep'` (or configure the custom component to render as smoothstep) where `subclassEdge` and `objectPropertyEdge` edges are constructed — primarily in `src/lib/rdf.ts` (lines ~166, ~197) and `src/lib/jsonToSchema.ts` (line ~176). If the custom edge components wrap the built-in smoothstep renderer, that's the right place; otherwise pass `type: 'smoothstep'` as the edge type and remove the custom type override for these edge kinds.
