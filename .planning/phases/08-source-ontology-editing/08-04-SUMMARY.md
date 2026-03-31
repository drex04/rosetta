---
phase: 08-source-ontology-editing
plan: 04
status: complete
commit: 7d91e60
build: pass
tests: 223 pass / 0 fail (unit); e2e excluded from vitest per project convention
test_metrics:
  unit_tests: 223
  new_tests: 11
  spec_tests_count: 0
---

## Objective

Implement mapping groups — when multiple source properties map to the same ontology target, auto-group them with a CONCAT/COALESCE/TEMPLATE strategy. Visual convergent edges on canvas, expandable group UI in MAP tab.

## What Was Built

### Task 1: MappingGroup data model + store actions
- Added `MappingGroup` discriminated union to `src/types/index.ts` (template variant requires `templatePattern: string`, not optional)
- Extended `Mapping` with `groupId?: string` and `groupOrder?: number`
- Added `groups: Record<string, MappingGroup[]>` state to mappingStore
- Implemented `createGroup`, `updateGroup`, `ungroupMappings`, `getGroupsForSource`, `getMappingsInGroup`
- `hydrate` extended to restore groups from IDB; `reset` clears groups

### Task 2: Group SPARQL generation
- Added `generateGroupConstruct(group, members)` to `src/lib/sparql.ts`
- **concat**: `BIND(CONCAT(STR(?v0), sep, STR(?v1)) AS ?joinedVal)`
- **coalesce**: `OPTIONAL { ?source src:propN ?vN }` + `BIND(COALESCE(?v0, ?v1) AS ?joinedVal)`
- **template**: parses `{0}`, `{1}` placeholders → CONCAT expression
- Members sorted by `groupOrder` in all strategies (review decision RD)
- Wired into `createGroup` and `updateGroup` — SPARQL auto-regenerates on changes

### Task 3: Auto-group detection + canvas rendering
- `onConnect` in OntologyCanvas detects duplicate target property after `addMapping`; triggers `GroupPromptState` overlay with Concat / Coalesce / Template / Keep separate buttons
- `useCanvasData.ts` passes `groupId` and `groupOrder` through mapping edge `data`
- `MappingEdge.tsx` rewritten: grouped edges offset vertically by `groupOrder`, render in emerald-400 (vs green-400 ungrouped), show "⊕" badge via `EdgeLabelRenderer`

### Task 4: MAP tab group UI
- `MappingPanel.tsx` shows group rows before ungrouped mappings
- Collapsible group header: target prop name + strategy badge (e.g. `CONCAT(2)`) + ungroup button
- Expanded group panel: strategy picker, separator input (concat), template pattern input (template), member list with ↑/↓ reorder buttons
- Group SPARQL shown read-only in CodeMirror when group selected via "View SPARQL ›"

## Files Changed

- `src/types/index.ts` — MappingGroup discriminated union, Mapping group fields, ProjectFile.groups
- `src/store/mappingStore.ts` — group state + actions, updated hydrate/reset, generateGroupConstruct wiring
- `src/lib/sparql.ts` — generateGroupConstruct (concat/coalesce/template strategies)
- `src/components/canvas/OntologyCanvas.tsx` — auto-group detection, GroupPromptState overlay
- `src/components/edges/MappingEdge.tsx` — grouped edge offset, emerald styling, ⊕ badge
- `src/hooks/useCanvasData.ts` — groupId/groupOrder in edge data
- `src/components/panels/MappingPanel.tsx` — group rows, expandable UI, strategy/separator/template config, reorder, read-only SPARQL view
- `src/__tests__/mappingGroups.test.ts` — 11 new tests (created)

## Must-Haves Coverage

- ✅ Drawing a second mapping edge to an ontology property that already has a mapping triggers a grouping prompt
- ✅ Grouped mappings generate a single SPARQL CONSTRUCT with CONCAT, COALESCE, or TEMPLATE strategy
- ✅ Grouped edges render with convergent visual treatment and a strategy badge on canvas
- ✅ MAP tab shows mapping groups as expandable rows with strategy picker, ordering, and separator/template config
- ✅ Ungrouping splits back to individual 1:1 mappings
- ✅ [review] MappingGroup uses a TypeScript discriminated union so templatePattern is required (not optional) when strategy is 'template'
- ✅ [review] generateGroupConstruct for COALESCE orders members by groupOrder (consistent with CONCAT behavior)
- ✅ [review] hydrate type guard for groups validates element shape via optional groups parameter with reset of selectedMappingId

## Issues Encountered

- `updateGroup` patch type used `Partial<Omit<MappingGroup, 'id' | 'strategy'>>` which loses `templatePattern` from the discriminated union. Fixed by changing to a flat explicit patch type: `Partial<{ strategy, separator, templatePattern, sparqlConstruct, targetClassUri, targetPropUri }>`.
