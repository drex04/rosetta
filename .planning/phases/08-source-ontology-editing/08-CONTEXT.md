# Phase 8: Source & Ontology Editing — Context

## Decisions

- **Source field rename:** Rename `Source.json` to `Source.rawData` and add `Source.dataFormat: 'json' | 'xml'`. Update all callsites. Add IDB migration guard (if stored data has `json` field, map it to `rawData` + set `dataFormat: 'json'`).
- **Source store extension:** Add `turtleSource: string` and `parseError: string | null` to Source interface. Use existing `updateSource(id, patch)` pattern — no new store actions needed.
- **Source bidi sync = clone useOntologySync:** Create `useSourceSync` hook mirroring `useOntologySync` with the same `isUpdatingFromCanvas` / `isUpdatingFromEditor` ref-guard pair and 600ms debounce. Critical: on debounce timer fire, re-read `activeSourceId` from store — if it changed, discard the pending parse. Clear timers on source switch.
- **Source node post-processing:** `parseTurtle` returns `OntologyNode[]` with `type: 'classNode'`. Must post-process to `type: 'sourceNode'` to render amber (not blue).
- **Full canvas CRUD for sources (REQ-64):** Implement from the start — create/delete/connect source nodes directly on canvas. Same interaction patterns as ontology editor. Context menu on canvas pane for "Add Source Class", context menu on nodes for "Add Property" / "Delete Node", connectable source handles.
- **Ontology canvas editor (REQ-66) = Plan 03:** Build the full ontology canvas editor before mapping groups. Includes: context menu ("Add Class"), node context menu ("Add Property", "Delete"), enable `isConnectable={true}` on ClassNode handles, SubclassEdge + ObjectPropertyEdge creation via drag, edge deletion. Add granular actions to ontologyStore (`addNode`, `removeNode`, `addProperty`, `removeProperty`, `addEdge`, `removeEdge`).
- **Mapping groups instead of JoinNode (REQ-67) = Plan 04:** No JoinNode. When user draws 2+ edges to the same ontology target property, auto-detect and prompt to create a MappingGroup. Groups have a strategy (concat/coalesce/template), generate a single SPARQL CONSTRUCT with BIND(CONCAT/COALESCE). Canvas renders grouped edges converging near target with a strategy badge. MAP tab shows groups as expandable entries. Existing `join` kind (cross-source key joins) stays unchanged.
- **MappingGroup data model:**
  ```
  Mapping: add groupId?: string, groupOrder?: number
  MappingGroup: { id, strategy, separator?, templatePattern?, targetClassUri, targetPropUri }
  Store in mappingStore alongside mappings.
  ```
- **XML parser:** Use browser-native `DOMParser` (zero bundle cost). New `xmlToSchema.ts` returns same `SchemaResult` as `jsonToSchema`. Only new dependency: `@codemirror/lang-xml` for syntax highlighting.
- **XML→RDFS mapping rules:** Element with children→rdfs:Class (PascalCase), leaf text element→DatatypeProperty, XML attribute→DatatypeProperty (prefixed `@`), nesting→ObjectProperty, repeated siblings→treat as array (use first for schema), text type inference via existing xsdRange logic.
- **File upload:** Hidden `<input type="file" accept=".json,.xml">` triggered by shadcn Button. No react-dropzone (overkill for single-file).
- **Filetype detection:** Dual-layer: MIME type from File API for uploads, first-non-whitespace-char heuristic (`{`/`[`→JSON, `<`→XML) for pasted content.
- **CodeMirror language switching:** Use React `key` prop tied to `dataFormat` to remount editor with correct language (JSON vs XML vs Turtle).
- **Reset source schema:** Button clears manual edits, re-runs `jsonToSchema` or `xmlToSchema` on `rawData`, replaces source nodes/edges/turtleSource.

## Review Decisions

- [review] **Plan 03 wave dependency fixed:** `depends_on` changed from `[]` to `[2]`. Both Plan 02 and Plan 03 modify `OntologyCanvas.tsx`; parallel execution would cause merge conflicts.
- [review] **Cross-store cascade wiring:** `removeNode` (Plan 03) and `resetSourceSchema` (Plan 02) must invalidate mappings. Wire via App.tsx store subscriptions — ontologyStore and sourcesStore remain decoupled from mappingStore. Pattern: `useEffect` subscribing to store deletions, then calling `mappingStore.clearMappingsForSource/Node`.
- [review] **Format change invalidates mappings:** When `Source.dataFormat` changes (JSON↔XML), call `mappingStore.clearMappingsForSource(sourceId)` and show toast. Prevents silent dangling-mapping state.
- [review] **FileReader.onerror:** Must set `reader.onerror = () => toast.error('Could not read file. Try again.')` in `handleFileUpload`. Never swallow silently.
- [review] **File upload size limit:** Reject files >1MB before FileReader reads them. Toast: "File too large (max 1MB). Paste content manually for larger files."
- [review] **xmlToSchema maxDepth guard:** DOM walker caps recursion at depth 10 to prevent stack overflow on adversarially deep XML.
- [review] **Schema regen debounced:** `rawData` changes trigger schema regeneration through the 600ms debounce path, not synchronously on every keystroke.
- [review] **screenToFlowPosition:** Context menu node creation must call `useReactFlow().screenToFlowPosition(event.clientX, event.clientY)` to place node at correct canvas coordinates.
- [review] **isValidConnection O(1):** Uses pre-built Sets of ontology/source node IDs (from useCanvasData), not Array.find per hover event. Covers 4 permutations: onto→onto ✓, source→source ✓, source-prop→onto-prop ✓, cross-type ✗.
- [review] **MappingGroup discriminated union:** `strategy: 'template'` branch requires `templatePattern: string` (not optional). Eliminates runtime throws from undefined template.
- [review] **COALESCE ordering:** `generateGroupConstruct` orders members by `groupOrder` for all strategies (concat, coalesce, template) for consistent behavior.
- [review] **E2E tests added:** Plan 01 adds `e2e/xml-upload.spec.ts`; Plan 03 adds `e2e/canvas-edit.spec.ts`.

## Deferred Ideas (from review)

- Extract shared bidirectional sync primitive from `useOntologySync` + `useSourceSync` for Phase 9 refactor — two 500-700 line hooks with identical patterns will drift.
- `useCanvasContextMenus()` hook to encapsulate OntologyCanvas right-click state — reduces OntologyCanvas fan-out (currently gains 6 new store dependencies in Phase 8).

## Discretion Areas

- Mixed XML content (elements with both text and child elements): treat as class with `_text` DatatypeProperty, or emit warning and skip. Executor decides.
- XML namespace handling: strip prefix for labels, preserve full qualified name in URI. Exact URI construction at executor discretion.
- Ontology canvas context menu library: use native right-click menu, shadcn DropdownMenu, or radix ContextMenu. Executor picks what fits.
- Grouped edge convergence rendering: exact visual treatment (bezier merging, badge position, color) at executor discretion within the constraint that it must be visually clear that edges are grouped.
- Source canvas node palette vs context menu: executor decides the creation pattern (must support both keyboard and mouse users).

## Deferred Ideas

- XSD-aware XML parsing (validating against provided XSD schema) — large scope increase, type inference from content is sufficient for v1.
- Drag-and-drop file upload zone — overkill for single-file; hidden input is sufficient.
- Cross-source key joins via mapping groups — existing `join` kind works; unification is a future consideration.
- Undo/redo for canvas operations — Phase 9 (REQ-74).
