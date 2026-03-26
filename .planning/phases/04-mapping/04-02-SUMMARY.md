---
phase: 04-mapping
plan: 02
status: complete
date: 2026-03-26
requirements-completed:
  - REQ-27
  - REQ-28
  - REQ-29
---

# Plan 04-02 Summary: SPARQL CONSTRUCT + MappingPanel

## What Was Built

- **sparql.ts** (`src/lib/sparql.ts`): `generateConstruct` function that builds a SPARQL CONSTRUCT query from a Mapping. Imports `localName` from `rdf.ts` (RD-01 respected). `derivePrefix` is local. Fallback to `'val'` when no local name segment is found.
- **sparql.test.ts** (`src/__tests__/sparql.test.ts`): 11 TDD tests covering CONSTRUCT/WHERE presence, hash-based prefix, slash-based prefix, correct class/prop local names, and `'val'` fallback.
- **useCanvasData.ts** (`src/hooks/useCanvasData.ts`): Mapping edges now carry `data: { mappingId }` (was `data: {}`). Stale-ref guard (sourceNode/targetNode not found → skip) was already in place from 04-01.
- **OntologyCanvas.tsx** (`src/components/canvas/OntologyCanvas.tsx`): `generateConstruct` called in `onConnect` before `addMapping` — every new mapping has a real SPARQL CONSTRUCT string instead of `''`.
- **MappingPanel.tsx** (`src/components/panels/MappingPanel.tsx`): Full MAP panel with:
  - Empty states: "No source selected" / "Drag from a source property…"
  - Mapping list — rows show `sourcePropLabel → targetPropLabel` (via `localName`), amber/blue color coding matching canvas semantics, delete (×) button
  - Selected mapping shows CodeMirror 6 SPARQL CONSTRUCT editor (DD-02) with external-sync guard
  - Lint badge (RD-05): green if CONSTRUCT+WHERE present, amber otherwise
  - Regenerate button: calls `generateConstruct` and `updateMapping`
- **RightPanel.tsx** (`src/components/layout/RightPanel.tsx`): MAP tab "Coming soon" replaced with `<MappingPanel />`.

## Tests

- `src/__tests__/sparql.test.ts`: 11/11 passing
- Full suite: 94/94 passing (9 test files)

## Commits

- `85a016b` test(04-02): add sparql.test.ts — RED tests for generateConstruct
- `4afdaff` feat(04-02): add sparql.ts with generateConstruct (GREEN)
- `593fb05` feat(04-02): populate mappingId in mapping edge data
- `9daf523` feat(04-02): wire generateConstruct into onConnect
- `a84773f` feat(04-02): add MappingPanel with mapping list and SPARQL CONSTRUCT editor
- `6b8718e` feat(04-02): wire MappingPanel into MAP tab of RightPanel

## Issues Encountered

- `localName` returns the full URI (not empty string) when no hash/slash delimiter yields a non-empty segment. Fixed: `srcPropRaw === mapping.sourcePropUri ? 'val' : srcPropRaw || 'val'` — catches this edge case.
- `generateConstruct` type is `Omit<Mapping, 'id' | 'kind' | 'sparqlConstruct'>` — `handleRegenerate` in MappingPanel correctly omits `kind` from the call object.

## Key Links

- `MappingPanel.tsx` → `mappingStore.ts` via `getMappingsForSource`, `updateMapping`, `removeMapping`, `setSelectedMappingId`
- `MappingPanel.tsx` → `sparql.ts` via `generateConstruct` (Regenerate button)
- `OntologyCanvas.tsx` → `sparql.ts` via `generateConstruct` (onConnect)
- `useCanvasData.ts` → `mappingStore.ts` for edge materialization with `mappingId` in data
