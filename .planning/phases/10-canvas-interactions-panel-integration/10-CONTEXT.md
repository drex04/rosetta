# Phase 10 Context: Canvas Interactions & Panel Integration

## Decisions

- [Edge type picker — source→source]: Drawing a source→source edge shows the edge type picker *before* creating the edge (same flow as onto→onto). Both "Subclass of" and "Object Property" are valid for source schema edges. `EdgePickerState` gains a `mode: 'create-onto' | 'create-source' | 'edit'` field; source→source `onConnect` sets `mode: 'create-source'` instead of creating directly.
- [Edge type change via double-click — both stores]: Double-clicking any `subclassEdge` or `objectPropertyEdge` (on ontology or source canvas) opens the picker in `mode: 'edit'` with `edgeId` set. Selecting a new type removes the old edge and adds a new one with default data. Both ontology edges and source schema edges support switching between subclassEdge and objectPropertyEdge.
- [Edge replace — atomic]: `ontologyStore` gets a `replaceEdge(oldId, newEdge)` action (remove + add in one `set` call). Source schema edge replacement uses existing `updateSource(sourceId, { schemaEdges: [...filtered, newEdge] })` — no new source store action needed.
- [Turtle sync fix in createOntologyEdge]: `createOntologyEdge` (and the new unified picker handler) must call `onCanvasChange(latestNodes, latestEdges)` after adding/replacing an ontology edge, and `onSourceCanvasChange` for source edges. This fixes the pre-existing bug where new onto→onto edges never synced to the Turtle editor.
- [Turtle sync via injected callback]: Inline edit commits via `onCommitEdit(nodeId, patch)` callback injected into node `data` (same pattern as `onContextMenu`) — defined in OntologyCanvas where `onCanvasChange` is accessible. After calling `updateNode`/`updateSchemaNode`, `onCommitEdit` calls `onCanvasChange(updatedNodes, edges)` to trigger Turtle re-serialization.
- [Edit form fields — node header]: Double-click shows two stacked `<input>` fields pre-filled with current `data.label` and `data.uri`; both must be committed together. ESC cancels with no change.
- [Property dataType edit]: Property row inline edit shows a text `<input>` for label + shadcn `<Select>` dropdown for dataType; common XSD types: `xsd:string`, `xsd:integer`, `xsd:float`, `xsd:boolean`, `xsd:date`, `xsd:anyURI`, `xsd:decimal`.
- [Discoverability buttons]: ReactFlow `<Panel position="top-left">` containing `+ Ontology Class` and `+ Source Class` buttons. `+ Source Class` is hidden when no source is active. Calls same handlers as the existing canvas context menu.
- [Rename context menu item]: Right-click → Rename calls `data.onStartEdit(nodeId)` injected via node data — triggers inline edit mode, does NOT use `window.prompt`. Remove `handleRename` / `window.prompt` from OntologyCanvas.
- [Edit state location]: `isEditing` and draft field state live inside the node component (ClassNode/SourceNode) as local `useState`. The `onStartEdit` callback (injected via data) sets a ref/state on the node to enter edit mode programmatically.

## Discretion Areas

- [Input validation rules]: Validate label as non-empty string; validate URI as containing `:` separator. Exact error messaging within these bounds.
- [Commit gesture]: Enter or blur commits; ESC cancels. Claude decides whether Tab commits or moves focus between the two fields.
- [Button styling]: `+ Ontology Class` / `+ Source Class` use shadcn `Button` size="sm" variant="outline"; style consistent with existing header buttons.
- [onStartEdit mechanism]: Claude decides whether to use a React `ref` forwarded to the node or a `data.editingNodeId` field on the node's data object to trigger edit mode from outside the component.

- [Double-click tab switch — handler location]: `OntologyCanvas.onNodeDoubleClick` calls `setActiveRightTab('ONTOLOGY'|'SOURCE')` based on node type, then calls `data.onStartEdit(nodeId)`. All canvas-level side-effects stay in OntologyCanvas; nodes do not reach into uiStore directly.
- [Edge selection — store-driven]: `useCanvasData` sets `selected: mapping.id === selectedMappingId` on each mapping edge. `OntologyCanvas.onEdgeClick` for mappingEdge type calls `setSelectedMappingId(edge.data.mappingId)` + `setActiveRightTab('MAP')`. Fully controlled — no React Flow native selection divergence.
- [Mapping edge kind label]: Always-visible small badge at edge midpoint for all non-grouped mapping edges. Grouped edges already show `⊕`; non-grouped show mapping kind abbreviation (e.g. `direct`, `tmpl`, `const`, `cast`, `lang`, `join`, `sparql`). Same style as the `⊕` badge.
- [kind in edge data]: `useCanvasData` includes `kind` in the edge `data` object so `MappingEdge` can render the label without a store lookup.

## Review Decisions

- [review] [onBlur commits]: `onBlur` on any inline edit input (header label, header URI, property label) commits the edit identically to Enter. Prevents nodes being stuck in edit mode when user clicks elsewhere on the canvas. Applies to ClassNode header, ClassNode property rows, and SourceNode header.
- [review] [onInvalidateMappings → delete + toast]: When `updateProperty` fires `onInvalidateMappings([oldUri])`, `OntologyCanvas.onCommitEdit` must delete all mappings whose `sourceHandle` or `targetHandle` references the old property URI, then show a toast: `'X mapping(s) removed — property URI changed'`. Use `useMappingStore.getState()` to find and delete affected entries.
- [review] [canvasToTurtle failure → revert store]: `handleCommitOntologyEdit` captures a pre-edit node snapshot before calling `updateNode`/`updateProperty`. If `onCanvasChange` throws, call `setNodes(preEditNodes)` to revert the canvas and show toast `'Edit failed — Turtle serialization error, changes reverted'`. This prevents canvas/Turtle divergence.
- [review] [useCanvasData split memo]: `useCanvasData` uses two memos for mapping edges: base memo (deps: `mappings`, `masterNodes`, `sources`) for structure + kind; selection memo (dep: `selectedMappingId` only) that annotates `selected: boolean`. This prevents full edge rebuild on every selection change.
- [review] [onNodeDoubleClick dual behavior]: `OntologyCanvas.onNodeDoubleClick` calls both `setActiveRightTab('ONTOLOGY'|'SOURCE')` (10-02) AND `data.onStartEdit(nodeId)` (10-01) in the same handler. Tab switch and inline edit entry are inseparable for double-click. Guard `onStartEdit` call with `typeof onStartEdit === 'function'` for forward compatibility.

## Deferred Ideas

- [URI prefix picker during edit]: Allowing the user to change the prefix (e.g., `nato:` → `ont:`) requires prefix management rework — deferred.
- [Undo for inline edits]: Connecting inline label/URI edits to the existing `_undoStack` — deferred to a later plan.
- [SourceNode property inline edit]: SourceNode currently has no property edit UI — deferred; source schema is primarily managed via JSON import.
- [canvasToTurtle post-commit failure recovery]: Toast + revert on serialize error — plan includes test; full retry/conflict resolution deferred.
