# Phase 9 Context: Bug Fixes & UI/UX Overhaul

## Decisions

- [Mapping invalidation on rename (REQ-83)]: Use Zustand `subscribe` on ontologyStore to diff property URIs before/after each `setNodes` call. When old URIs disappear, call `removeInvalidMappings`. Matches existing pattern (validation subscribes to mappings). (alternatives: explicit calls from sync hooks — more targeted but fragile, easy to miss callsites)
- [Canvas→editor sync (REQ-82)]: Subscribe to ontologyStore node/edge changes and auto-serialize to Turtle via `canvasToTurtle`, using `isUpdatingFromEditor` guard to prevent circular updates. Granular mutations (addNode, removeNode, etc.) currently bypass `onCanvasChange`. (alternatives: add explicit `onCanvasChange()` calls in every granular mutation — fragile, new mutations would need manual wiring)
- [Transform & Fuse namespace fix (REQ-84)]: Fix `derivePrefix` in sparql.ts to produce the same prefix that `instanceGenerator` uses (sourced from `schemaNodes[0].data.prefix`). The CONSTRUCT query's `src:` prefix must equal the instance store's `uriBase`. (alternatives: fix instanceGenerator to match derivePrefix — would break other consumers of instanceGenerator)
- [CodeMirror selection (REQ-81)]: Add `.cm-selectionBackground` and `::selection` CSS rules to `lightTheme` in codemirror-theme.ts. The current theme has no selection styling.
- [Source .ttl position preservation (REQ-79)]: The `convertToSourceNodes` already preserves positions by ID and URI. Root cause is likely that `parseTurtle` generates different node IDs on re-parse when class URIs change during rename. Fix: ensure stable node ID generation in `parseTurtle` or match by class URI more robustly in `convertToSourceNodes`.
- [Context menu + dialog overlap (REQ-80)]: Ensure Radix DropdownMenu portal unmounts before AddPropertyDialog mounts. Add a microtask delay or use state machine to sequence menu close → dialog open.

### Plan 02 — UI/UX Overhaul Decisions

- [Tab bar selected state (REQ-85)]: Use the OUTPUT subtab pattern: active tab gets `bg-primary text-primary-foreground`, inactive gets `text-muted-foreground hover:bg-muted`. Apply as explicit className overrides on TabsTrigger, replacing the shadcn default subtle background.
- [Tab rename INPUT→SOURCE (REQ-86)]: Rename `'INPUT'` → `'SOURCE'` in uiStore.ts RightTab union, default value, all TabsTrigger/TabsContent values in RightPanel.tsx. Also rename `'VALIDATE'` tab label display to `'SHACL'` (value stays `'VALIDATE'` internally).
- [Button normalization (REQ-87)]: Use MAP tab's inline action button pattern as template: `text-xs px-2.5 py-1 rounded bg-primary text-primary-foreground` for primary actions, `text-xs px-2 py-1 rounded border border-border hover:bg-muted` for secondary.
- [Source bar amber removal (REQ-88)]: Replace `bg-amber-50/40 border-amber-100` container with `bg-background border-border`. Active chip: replace `bg-amber-500 text-white ring-amber-400` with `bg-primary/10 text-primary ring-primary` (neutral primary tint). Inactive chip: keep `bg-muted text-muted-foreground`.
- [Add Source discoverability (REQ-88)]: Replace bare `+` icon button with a labeled "Add Source" button (`text-xs flex items-center gap-1 px-2 py-0.5 rounded border border-dashed border-border hover:border-primary hover:text-primary`) at the end of the chip row.
- [Source chip indicators removal (REQ-92)]: Remove the `✓`/`⚠`/`○` validation status spans from chips entirely. Validation status belongs in the SHACL tab.
- [StatusBar reorganization (REQ-91)]: Move Saved/Saving/Error status to the right side of StatusBar (where GitHub icon was). Increase font from `text-[11px]` to `text-xs`, icon size from 14 to 16. GitHub icon moves to Header masthead (far right, after existing ghost icon buttons).
- [Validate button relocation (REQ-90)]: Remove Validate button from Header.tsx. Add it to ValidationPanel's header row with `bg-primary text-primary-foreground` styling (matching FusedTab's Transform & Fuse button). Remove `setActiveRightTab('VALIDATE')` call since user is already on the tab.
- [Resizable RDFS pane (REQ-89)]: Pointer-drag resize handle between the data editor and RDFS schema pane — same pattern as RightPanel's left-edge drag (pointerDown → pointermove on window → pointerup cleanup). State: `rdfsHeight: number` local to SourcePanel, default 200px (can be anything reasonable). Move Reset Schema button from the shared toolbar into the RDFS pane's own header row. Keep expand/collapse toggle on the RDFS pane header but make drag the primary resize mechanism.
- [MAP dataType display (REQ-93)]: In MappingPanel direct mapping list, show range for each side. Look up from `useOntologyStore(s => s.nodes)` for target and `useSourcesStore` active source `schemaNodes` for source. Each node's `data.properties[]` array has a `range` field (`"xsd:float"` or full URI). Format: `localName(sourcePropUri) [sourceRange] → localName(targetPropUri) [targetRange]`. Use `localName()` from `src/lib/rdf.ts` to normalize full-URI ranges.
- [SPARQL error display (REQ-94)]: ValidationPanel already reads `error` (global store error) and per-source results. Extend result display: for each source result, show violation `message` strings below the VALID/INCOMPLETE count, inside a collapsible `<details>` element. No new store changes needed.
- [OUTPUT inline previews (REQ-95)]: Add collapsible `<pre>` viewers inside ExportTab for RML and YARRRML content (same style as FusedJsonViewer). Generate content via existing `generateRml`/`generateYarrrml` functions, memoized with `useMemo`. Show each preview in a collapsed-by-default `<details>` to avoid overwhelming the panel.

## Discretion Areas

- [Node ID stability strategy]: Executor may choose between stabilizing IDs in `parseTurtle` vs improving the position-matching fallback in `convertToSourceNodes` — whichever produces cleaner code.
- [Mapping invalidation diff granularity]: Executor decides whether to diff at the property URI level or at the full node-property snapshot level. Either is fine as long as renamed properties are detected.
- [CodeMirror selection colors]: Use standard blue selection that matches the rest of the UI. Executor picks exact hex values.

- [review] [Context menu/dialog decoupling (REQ-80)]: Expand `addPropFor` state to include `nodeType`, remove `nodeMenu` dependency from dialog render condition. Original plan approach (microtask delay) would have broken the dialog since it depends on `nodeMenu` being non-null.
- [review] [canvasToTurtle error surfacing (REQ-82)]: Wrap canvasToTurtle in try-catch, surface errors as Turtle validation messages in editor status area so user knows about invalid node state.
- [review] [Editor read-only during debounce (REQ-82)]: Briefly lock editor during 100ms canvas→editor debounce to prevent user edits from being overwritten by pending sync.
- [review] [Cross-store subscription pattern (REQ-83)]: Use dedicated `useInvalidateMappings` hook mounted in App.tsx, following existing hook patterns (useAutoSave, useOntologySync). Avoids store→store import cycles.
- [review] [Empty schemaNodes guard (REQ-84)]: Guard `executeAllConstructs` against sources with empty schemaNodes — skip with console.warn instead of crashing on `schemaNodes[0].data.prefix`.
- [review] [Position fallback test]: Add unit test for `convertToSourceNodes` index-based position fallback on class rename.

### Plan 03 — Gap Analysis Closure Decisions

- [IDB restore error visibility (gap item 7)]: Call `setSaveStatus('error')` in both outer catch blocks inside the restore `useEffect` in `useAutoSave.ts`. No new UI surface — StatusBar already renders the error state.
- [canvasToTurtle error surfacing (gap items 4,5)]: In `useOntologySync.ts` catch: call `useOntologyStore.getState().setParseError('Canvas serialization failed — check for invalid node state')`. In `useSourceSync.ts` catch: call `useSourcesStore.getState().updateSource(currentSourceId, { parseError: 'Canvas serialization failed' })`.
- [instanceGenerator empty uriBase guard (gap item 5)]: After `const uriBase = schemaNodes[0]?.data.prefix ?? ''`, immediately `if (!uriBase) return store` to prevent bare-URI triples that silently evade SHACL validation.
- [Shared string utils extraction (gap item 12)]: Create `src/lib/stringUtils.ts` exporting `toPascalCase` and `xsdRangeShort`. Update `instanceGenerator.ts` and `jsonToSchema.ts` to import from there. Remove the duplicate local copies.
- [STANDARD_NAMESPACES dead export (gap item 10)]: Remove `export` keyword from `STANDARD_NAMESPACES` in `src/lib/rdf.ts` (make it a module-private `const`). It is confirmed never imported anywhere.
- [Unused npm deps removal (gap item 11)]: Remove `@testing-library/dom`, `@codemirror/commands`, `@codemirror/language`, `@codemirror/theme-one-dark` from `package.json` devDependencies. Verify with `npm run build` post-removal.
- [jsonldFramer tests approach (gap item 9)]: Integration style — real N3.Store + real ontology node data, no mocking of `jsonld.compact`. Tests cover: empty store early-return, context built from ontology URIs, standard prov/xsd prefixes, first-wins on duplicate keys.
- [layout.ts tests approach (gap item 8)]: Unit tests for `applyTreeLayout` — empty input, single node, parent-child indentation, multiple roots stacked vertically, property-count-aware height, orphan nodes placed after DFS traversal, baseX offset applied.

## Deferred Ideas

- [Subscription-based auto-regeneration of SPARQL on mapping kind change]: Already handled by REQ-55 in Phase 7. Not in scope here.
- [Full undo/redo for mapping invalidation]: `_undoStack` already exists in mappingStore. Not extending it here beyond what's needed for REQ-83.
- [Expansion opportunity]: Position-stability layer that snapshots/restores all node positions by structural identity across any Turtle re-parse, plus comprehensive property-rename propagation through mappings, SPARQL queries, and SHACL shapes.
- [canvasToTurtle subscribe unit tests]: Hook-level tests for canvas→editor sync require Zustand mocking. Deferred — manual verification sufficient for now.
- [executeAllConstructs empty-source guard test]: Unit test for skipping sources with empty schemaNodes. Low effort but deferred from this plan.
