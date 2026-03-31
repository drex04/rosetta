---
phase: 08-source-ontology-editing
plan: 02
status: complete
commit: c9ec8b7
test_metrics:
  unit_passed: 231
  unit_failed: 0
  spec_tests_count: 4
---

# Summary: Bidirectional Source Turtle↔Canvas Sync

## Objective
Make source schemas fully editable with bidirectional Turtle↔canvas sync, canvas CRUD operations for source nodes, and a reset button — cloning the proven `useOntologySync` pattern.

## What Was Built

### `src/hooks/useSourceSync.ts` (new)
Bidirectional sync hook mirroring `useOntologySync`:
- `isUpdatingFromCanvas` / `isUpdatingFromEditor` ref guards prevent circular updates
- `onSourceEditorChange`: immediate store write + 600ms debounced parse → convert to source nodes → update store; stale-source-ID guard discards parses if `activeSourceId` changed during debounce
- `onSourceCanvasChange`: serializes canvas state to Turtle via `sourceCanvasToTurtle`, updates store
- `resetSourceSchema`: re-runs `jsonToSchema`/`xmlToSchema` on `rawData`, clears manual edits and mappings via `mappingStore.clearMappingsForSource`
- Timer cleanup on source switch via `useEffect` dependency on `activeSourceId`

### `src/lib/rdf.ts` (modified)
- `sourceCanvasToTurtle(nodes, edges, uriPrefix)`: delegates to `canvasToTurtle`; handles empty-nodes case (returns valid prefix-only Turtle, never throws)
- `convertToSourceNodes(ontologyNodes, existingSourceNodes)`: converts `parseTurtle` output (`type: 'classNode'`) to `type: 'sourceNode'` (amber), overlaying positions from existing nodes by ID/URI match

### `src/store/sourcesStore.ts` (modified)
Added `turtleSource: string` and `parseError: string | null` to `Source` interface with defaults; `migrateSource` sets both fields for backward compatibility.

### `src/components/panels/SourcePanel.tsx` (modified)
Replaced read-only Turtle viewer with editable CodeMirror when `onSourceEditorChange` prop is provided. Added "Reset Schema" button to toolbar.

### `src/components/canvas/OntologyCanvas.tsx` (modified)
Added `onSourceCanvasChange` prop; fires debounced (100ms) call when source nodes change structurally in `onNodesChange`.

### `src/App.tsx` (modified)
Mounts `useSourceSync()` hook; passes `onSourceCanvasChange` to `OntologyCanvas` and `onSourceEditorChange`/`resetSourceSchema` to `RightPanel`.

### `src/components/layout/RightPanel.tsx` (modified)
Forwards `onSourceEditorChange` and `resetSourceSchema` to `SourcePanel`.

### `src/components/layout/Header.tsx` + `SourceSelector.tsx` (modified)
New source objects include `turtleSource` and `parseError: null` fields.

## Test Results
- `useSourceSync`: 4/4 tests pass (editor→nodes after debounce, canvas→turtle, stale-source discard, reset from rawData)
- Full unit suite: 231/231 passed
- Build: zero TypeScript errors

## must_haves Coverage
- Source .ttl editor is editable — typing Turtle updates source canvas nodes within 1s ✓
- Dragging/adding/deleting source nodes on canvas updates the source .ttl editor ✓
- Reset button re-generates schema from rawData, clearing all manual edits ✓
- Switching sources during a pending sync does not corrupt the wrong source's data ✓
- `sourceCanvasToTurtle([])` returns valid Turtle, never throws ✓
- Reset button invalidates existing mappings via `clearMappingsForSource` ✓
- Amber color scheme preserved via `convertToSourceNodes` post-processing ✓

## Issues Encountered
None. Build and tests clean.

## Files Changed
- `src/hooks/useSourceSync.ts` (new)
- `src/__tests__/useSourceSync.test.ts` (new)
- `src/lib/rdf.ts`
- `src/store/sourcesStore.ts`
- `src/components/panels/SourcePanel.tsx`
- `src/components/layout/RightPanel.tsx`
- `src/components/canvas/OntologyCanvas.tsx`
- `src/App.tsx`
- `src/components/layout/Header.tsx`
- `src/components/layout/SourceSelector.tsx`
- `src/__tests__/shacl.test.ts`
- `src/__tests__/useCanvasData.test.ts`
- `src/__tests__/validationStore.test.ts`
